import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Payment from "@/models/Payment";
import Order from "@/models/Order";
import { getSessionUser } from "@/lib/session";
import { verifyPaymentSchema, firstError } from "@/lib/validations";
import { verifyCheckoutSignature } from "@/lib/integrations/razorpay";
import { confirmPayment } from "@/lib/services/payment.service";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = verifyPaymentSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: firstError(parsed.error) }, { status: 400 });
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = parsed.data;

  if (!verifyCheckoutSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
    return NextResponse.json({ error: "Payment signature could not be verified" }, { status: 400 });
  }

  await connectDB();
  const payment = await Payment.findOne({ razorpayOrderId: razorpay_order_id });
  const order = payment ? await Order.findById(payment.orderId).select("userId") : null;
  if (!payment || !order || order.userId.toString() !== user.id) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  // The signature proves the browser callback is genuine, but we still ask Razorpay directly
  // for the payment status and amount before marking anything paid.
  const result = await confirmPayment(razorpay_order_id, razorpay_payment_id, { signatureVerified: true });
  if (result.state === "paid") return NextResponse.json({ status: "paid", orderId: result.orderId });
  if (result.state === "pending") return NextResponse.json({ status: "pending", orderId: result.orderId }, { status: 202 });
  return NextResponse.json({ error: "Payment was not completed" }, { status: 402 });
}
