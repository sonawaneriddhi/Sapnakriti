import crypto from "crypto";
import type { z } from "zod";
import { connectDB } from "@/lib/db";
import Order from "@/models/Order";
import Product from "@/models/Product";
import Payment from "@/models/Payment";
import Counter from "@/models/Counter";
import { RESERVATION_MINUTES, MAX_QTY_PER_ITEM, calcShipping, ORDER_STATUS_FLOW } from "@/lib/config";
import { reserveItems, releaseItems, commitItems } from "@/lib/services/inventory.service";
import { enqueueOrderNotifications, processNotifications } from "@/lib/services/notification.service";
import { getRazorpay } from "@/lib/integrations/razorpay";
import type { addressSchema } from "@/lib/validations";

type Address = z.infer<typeof addressSchema>;

function randomChars(len: number, alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789") {
  let out = "";
  for (let i = 0; i < len; i++) out += alphabet[crypto.randomInt(alphabet.length)];
  return out;
}

export function makeOrderNumber() {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `SAP-${ymd}-${randomChars(5)}`;
}

export function makePackingCode() {
  return `PK-${randomChars(4)}-${randomChars(4)}`;
}

/** Consecutive invoice numbers per Indian financial year, e.g. SAP/2026-27/0001. */
async function nextInvoiceNumber() {
  const now = new Date();
  const startYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const fy = `${startYear}-${String((startYear + 1) % 100).padStart(2, "0")}`;
  const c = await Counter.findOneAndUpdate({ _id: `invoice-${fy}` }, { $inc: { seq: 1 } }, { upsert: true, new: true });
  return `SAP/${fy}/${String(c.seq).padStart(4, "0")}`;
}

export type CreateOrderResult =
  | { ok: true; order: InstanceType<typeof Order> }
  | { ok: false; status: number; error: string };

/**
 * Validates the cart against the DATABASE (prices, active flag, stock), recalculates every
 * total on the server, creates a pending order and reserves stock.
 */
export async function createPendingOrder(input: {
  userId: string;
  items: { productId: string; quantity: number }[];
  address: Address;
}): Promise<CreateOrderResult> {
  await connectDB();
  await releaseExpiredReservations();

  // Merge duplicate lines.
  const wanted = new Map<string, number>();
  for (const i of input.items) wanted.set(i.productId, Math.min(MAX_QTY_PER_ITEM, (wanted.get(i.productId) ?? 0) + i.quantity));

  const products = await Product.find({ _id: { $in: [...wanted.keys()] } });
  const byId = new Map(products.map((p) => [p._id.toString(), p]));

  const items = [];
  for (const [productId, quantity] of wanted) {
    const p = byId.get(productId);
    if (!p || !p.isActive) return { ok: false, status: 409, error: "An item in your cart is no longer available" };
    const available = p.stockQuantity - p.reservedQuantity;
    if (available < quantity) {
      return {
        ok: false,
        status: 409,
        error: available <= 0 ? `${p.name} is out of stock` : `Only ${available} of ${p.name} left in stock`,
      };
    }
    items.push({
      productId: p._id,
      productName: p.name,
      productSlug: p.slug,
      imageUrl: p.images?.[0]?.url ?? "",
      unitPricePaise: p.pricePaise,
      quantity,
      lineTotalPaise: p.pricePaise * quantity,
    });
  }

  const subtotalPaise = items.reduce((s, i) => s + i.lineTotalPaise, 0);
  const shippingPaise = calcShipping(subtotalPaise);
  const discountPaise = 0;
  const totalPaise = subtotalPaise + shippingPaise - discountPaise;
  if (totalPaise < 100) return { ok: false, status: 400, error: "Order total is too low" };

  let order;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      order = await Order.create({
        orderNumber: makeOrderNumber(),
        userId: input.userId,
        items,
        deliveryAddress: input.address,
        subtotalPaise,
        shippingPaise,
        discountPaise,
        totalPaise,
        paymentStatus: "pending",
        orderStatus: "pending_payment",
        stockState: "held",
        reservationExpiresAt: new Date(Date.now() + RESERVATION_MINUTES * 60 * 1000),
      });
      break;
    } catch (err) {
      if ((err as { code?: number }).code !== 11000 || attempt === 2) throw err;
    }
  }
  if (!order) return { ok: false, status: 500, error: "Could not create order" };

  const reserved = await reserveItems(items, order._id);
  if (!reserved.ok) {
    await Order.deleteOne({ _id: order._id });
    return { ok: false, status: 409, error: `${reserved.productName} just sold out` };
  }
  return { ok: true, order };
}

/** Give reserved stock back and mark the (unpaid) order cancelled. Idempotent. */
export async function cancelUnpaidOrder(orderId: string, reason: string) {
  await connectDB();
  const claimed = await Order.findOneAndUpdate(
    { _id: orderId, paymentStatus: { $ne: "paid" }, stockState: "held" },
    { $set: { stockState: "released", orderStatus: "cancelled", paymentStatus: "failed" } },
    { new: false }
  );
  if (claimed) await releaseItems(claimed.items, claimed._id, reason);
  return !!claimed;
}

/** Called opportunistically and by the maintenance cron. */
export async function releaseExpiredReservations() {
  await connectDB();
  const expired = await Order.find({
    paymentStatus: "pending",
    stockState: "held",
    reservationExpiresAt: { $lt: new Date() },
  })
    .select("_id")
    .limit(50)
    .lean();
  for (const o of expired) await cancelUnpaidOrder(o._id.toString(), "Payment window expired");
  return expired.length;
}

/**
 * Marks an order paid exactly once, no matter how many times it is called
 * (browser callback + webhook + retries). Caller must already have confirmed the
 * payment with Razorpay.
 */
export async function finalizePaidOrder(orderId: string, razorpayPaymentId: string) {
  await connectDB();
  const order = await Order.findById(orderId);
  if (!order) throw new Error("Order not found");
  if (order.paymentStatus === "paid") return order;

  // Money arrived after our reservation expired: try to take the stock again, otherwise refund.
  if (order.stockState === "released") {
    const claimed = await Order.findOneAndUpdate({ _id: order._id, stockState: "released" }, { $set: { stockState: "held" } });
    if (claimed) {
      const r = await reserveItems(order.items, order._id);
      if (!r.ok) {
        await Order.updateOne({ _id: order._id }, { $set: { stockState: "released" } });
        return refundLatePayment(orderId, razorpayPaymentId);
      }
    }
  }

  let won = null;
  for (let attempt = 0; attempt < 5 && !won; attempt++) {
    try {
      const invoiceNumber = await nextInvoiceNumber();
      won = await Order.findOneAndUpdate(
        { _id: order._id, paymentStatus: { $ne: "paid" } },
        {
          $set: {
            paymentStatus: "paid",
            orderStatus: "confirmed",
            paidAt: new Date(),
            packingCode: makePackingCode(),
            invoiceNumber,
            invoiceUrl: `/api/invoices/${order._id}`,
          },
        },
        { new: true }
      );
      if (!won) break; // someone else finalised it in the meantime
    } catch (err) {
      if ((err as { code?: number }).code !== 11000) throw err; // retry on a packing-code collision
    }
  }
  if (!won) return Order.findById(orderId);

  // Only the call that won the race commits stock and queues notifications.
  const commitClaim = await Order.findOneAndUpdate({ _id: won._id, stockState: "held" }, { $set: { stockState: "committed" } });
  if (commitClaim) {
    const ok = await commitItems(won.items, won._id);
    if (!ok) console.error(`[order ${won.orderNumber}] stock commit incomplete, check inventory log`);
  }

  await enqueueOrderNotifications(won._id.toString());
  // Best effort right now; the cron job retries anything that fails.
  await processNotifications({ orderId: won._id.toString() }).catch((e) => console.error("notify failed", e));

  return Order.findById(orderId);
}

async function refundLatePayment(orderId: string, razorpayPaymentId: string) {
  const order = await Order.findById(orderId);
  if (!order) throw new Error("Order not found");
  try {
    await getRazorpay().payments.refund(razorpayPaymentId, {
      amount: order.totalPaise,
      notes: { reason: "Item sold out before payment completed", orderNumber: order.orderNumber },
    });
    await Order.updateOne({ _id: order._id }, { $set: { paymentStatus: "refunded", orderStatus: "cancelled" } });
    await Payment.updateOne({ orderId: order._id }, { $set: { status: "refunded" } });
  } catch (err) {
    console.error(`[order ${order.orderNumber}] LATE PAYMENT NEEDS MANUAL REFUND`, err);
  }
  return Order.findById(orderId);
}

/** Admin: move a paid order forward through the fulfilment flow. Payment status is untouched. */
export async function updateFulfilment(
  orderId: string,
  patch: { orderStatus?: (typeof ORDER_STATUS_FLOW)[number]; courierName?: string; courierTrackingNumber?: string }
) {
  await connectDB();
  const order = await Order.findById(orderId);
  if (!order) throw new Error("Order not found");
  if (order.paymentStatus !== "paid") throw new Error("Only paid orders can be fulfilled");

  const set: Record<string, unknown> = {};
  if (patch.orderStatus) {
    const from = ORDER_STATUS_FLOW.indexOf(order.orderStatus as (typeof ORDER_STATUS_FLOW)[number]);
    const to = ORDER_STATUS_FLOW.indexOf(patch.orderStatus);
    if (from === -1) throw new Error(`Cannot change an order that is ${order.orderStatus}`);
    if (to < from) throw new Error("Orders can only move forward");
    set.orderStatus = patch.orderStatus;
  }
  if (patch.courierName !== undefined) set.courierName = patch.courierName;
  if (patch.courierTrackingNumber !== undefined) set.courierTrackingNumber = patch.courierTrackingNumber;
  if (Object.keys(set).length === 0) return order;
  return Order.findByIdAndUpdate(orderId, { $set: set }, { new: true });
}
