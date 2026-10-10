import { connectDB } from "@/lib/db";
import Order from "@/models/Order";
import Payment from "@/models/Payment";
import { getRazorpay } from "@/lib/integrations/razorpay";
import { cancelUnpaidOrder, finalizePaidOrder } from "@/lib/services/order.service";

/** Create the Razorpay order for a pending order, using the SERVER-calculated total. */
export async function createRazorpayOrder(order: InstanceType<typeof Order>) {
  try {
    const rzp = await getRazorpay().orders.create({
      amount: order.totalPaise,
      currency: "INR",
      receipt: order.orderNumber,
      notes: { orderId: order._id.toString(), orderNumber: order.orderNumber },
    });
    await Payment.create({
      orderId: order._id,
      provider: "razorpay",
      razorpayOrderId: rzp.id,
      amountPaise: order.totalPaise,
      currency: "INR",
      status: "created",
    });
    return rzp.id;
  } catch (err) {
    // Don't leave stock locked if we couldn't even start the payment.
    await cancelUnpaidOrder(order._id.toString(), "Could not create Razorpay order");
    throw err;
  }
}

export type ConfirmResult =
  | { state: "paid"; orderId: string }
  | { state: "pending"; orderId: string }
  | { state: "failed"; orderId: string }
  | { state: "unknown" };

/**
 * Asks Razorpay (not the browser) what really happened to this payment, checks the order
 * and amount match, and only then finalises the order. Safe to call from both the checkout
 * callback and the webhook.
 */
export async function confirmPayment(razorpayOrderId: string, razorpayPaymentId: string, opts?: { signatureVerified?: boolean }): Promise<ConfirmResult> {
  await connectDB();
  const payment = await Payment.findOne({ razorpayOrderId });
  if (!payment) return { state: "unknown" };
  const orderId = payment.orderId.toString();

  const order = await Order.findById(orderId);
  if (!order) return { state: "unknown" };
  if (order.paymentStatus === "paid") return { state: "paid", orderId };

  const rzp = getRazorpay();
  let remote = await rzp.payments.fetch(razorpayPaymentId);

  // The payment must belong to THIS Razorpay order and match the amount we calculated.
  if (remote.order_id !== razorpayOrderId) return { state: "unknown" };
  if (Number(remote.amount) !== order.totalPaise || remote.currency !== "INR") {
    console.error(`[order ${order.orderNumber}] amount/currency mismatch from Razorpay`);
    return { state: "failed", orderId };
  }

  if (remote.status === "authorized") {
    remote = await rzp.payments.capture(razorpayPaymentId, order.totalPaise, "INR");
  }

  if (remote.status === "captured") {
    await Payment.updateOne(
      { _id: payment._id },
      { $set: { razorpayPaymentId, status: "captured", ...(opts?.signatureVerified ? { signatureVerified: true } : {}) } }
    );
    await finalizePaidOrder(orderId, razorpayPaymentId);
    return { state: "paid", orderId };
  }

  if (remote.status === "failed") {
    await Payment.updateOne({ _id: payment._id, status: { $ne: "captured" } }, { $set: { status: "failed" } });
    return { state: "failed", orderId };
  }
  return { state: "pending", orderId };
}
