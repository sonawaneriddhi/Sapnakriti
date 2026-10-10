import { connectDB } from "@/lib/db";
import Notification from "@/models/Notification";
import Order from "@/models/Order";
import { sendEmail } from "@/lib/integrations/email";
import { sendOrderWhatsApp } from "@/lib/integrations/whatsapp";
import { generateInvoicePdf } from "@/lib/services/invoice.service";
import { signedInvoiceLink, siteUrl } from "@/lib/invoiceToken";
import { formatPaise } from "@/lib/utils";

const MAX_ATTEMPTS = 6;
const STALE_LOCK_MS = 5 * 60 * 1000;

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);

/** Queue one email + one WhatsApp confirmation per order. Safe to call repeatedly. */
export async function enqueueOrderNotifications(orderId: string) {
  await connectDB();
  for (const channel of ["email", "whatsapp"] as const) {
    await Notification.updateOne(
      { orderId, channel },
      { $setOnInsert: { orderId, channel, status: "pending", attempts: 0, nextAttemptAt: new Date() } },
      { upsert: true }
    );
  }
}

/** Reset notifications so an admin can resend them. Only for paid orders. */
export async function requeueOrderNotifications(orderId: string, channel?: "email" | "whatsapp") {
  await connectDB();
  const order = await Order.findById(orderId).select("paymentStatus");
  if (!order || order.paymentStatus !== "paid") throw new Error("Only paid orders can be notified");
  await enqueueOrderNotifications(orderId);
  await Notification.updateMany(
    { orderId, ...(channel ? { channel } : {}), status: { $in: ["failed", "sent"] } },
    { $set: { status: "pending", attempts: 0, nextAttemptAt: new Date(), lastError: "" } }
  );
}

/** Deliver due notifications (optionally just for one order). Never throws. */
export async function processNotifications(opts: { orderId?: string; limit?: number } = {}) {
  await connectDB();
  const limit = opts.limit ?? 20;
  let processed = 0;

  while (processed < limit) {
    const now = new Date();
    const n = await Notification.findOneAndUpdate(
      {
        ...(opts.orderId ? { orderId: opts.orderId } : {}),
        $or: [
          { status: "pending", nextAttemptAt: { $lte: now } },
          { status: "processing", lockedAt: { $lt: new Date(now.getTime() - STALE_LOCK_MS) } },
        ],
      },
      { $set: { status: "processing", lockedAt: now }, $inc: { attempts: 1 } },
      { new: true }
    );
    if (!n) break;
    processed++;

    try {
      await deliver(n.orderId.toString(), n.channel);
      await Notification.updateOne({ _id: n._id }, { $set: { status: "sent", sentAt: new Date(), lastError: "" } });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const exhausted = n.attempts >= MAX_ATTEMPTS;
      const backoffMin = Math.min(2 ** n.attempts, 120);
      await Notification.updateOne(
        { _id: n._id },
        {
          $set: {
            status: exhausted ? "failed" : "pending",
            lastError: message.slice(0, 500),
            nextAttemptAt: new Date(Date.now() + backoffMin * 60 * 1000),
          },
        }
      );
    }
  }
  return processed;
}

async function deliver(orderId: string, channel: "email" | "whatsapp") {
  const order = await Order.findById(orderId);
  if (!order || order.paymentStatus !== "paid") throw new Error("Order is not paid");
  const a = order.deliveryAddress;

  if (channel === "email") {
    if (!a?.email) throw new Error("Order has no email address");
    const pdf = await generateInvoicePdf(order);
    const rows = order.items
      .map(
        (i) =>
          `<tr><td style="padding:6px 0">${esc(i.productName)} × ${esc(i.quantity)}</td><td style="padding:6px 0;text-align:right">${esc(formatPaise(i.lineTotalPaise ?? 0))}</td></tr>`
      )
      .join("");
    const html = `
<div style="background:#F7F3EA;padding:32px 16px;font-family:Georgia,serif;color:#302820">
  <div style="max-width:560px;margin:0 auto;background:#fff;padding:32px;border:1px solid #D9C7AD">
    <p style="letter-spacing:6px;color:#555B43;font-size:20px;margin:0">SAPNAKRITI</p>
    <p style="font-size:11px;letter-spacing:3px;color:#9BA58A;margin:4px 0 24px">HANDMADE WITH INTENTION</p>
    <h2 style="font-weight:normal">Thank you, ${esc(a.fullName)}.</h2>
    <p>Your payment was received and order <b>${esc(order.orderNumber)}</b> is confirmed.</p>
    <div style="background:#F7F3EA;padding:16px;margin:20px 0;text-align:center">
      <div style="font-size:12px;letter-spacing:2px;color:#555B43">YOUR PACKING CODE</div>
      <div style="font-size:26px;letter-spacing:4px;margin-top:6px"><b>${esc(order.packingCode)}</b></div>
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:15px">${rows}
      <tr><td style="padding:6px 0;border-top:1px solid #D9C7AD">Shipping</td><td style="padding:6px 0;border-top:1px solid #D9C7AD;text-align:right">${order.shippingPaise === 0 ? "Free" : esc(formatPaise(order.shippingPaise))}</td></tr>
      <tr><td style="padding:6px 0"><b>Total paid</b></td><td style="padding:6px 0;text-align:right"><b>${esc(formatPaise(order.totalPaise))}</b></td></tr>
    </table>
    <p style="font-size:14px;margin-top:24px"><b>Delivering to:</b><br>${esc(a.fullName)}, ${esc(a.line1)}${a.line2 ? ", " + esc(a.line2) : ""}, ${esc(a.city)}, ${esc(a.state)} ${esc(a.postalCode)}</p>
    <p style="font-size:14px">Your invoice is attached. You can also view this order anytime at <a href="${siteUrl()}/orders/${order._id}" style="color:#B66E50">${siteUrl()}/orders/${order._id}</a>.</p>
  </div>
</div>`;
    await sendEmail({
      to: a.email,
      subject: `Your SAPNAKRITI order ${order.orderNumber} is confirmed`,
      html,
      attachments: [{ filename: `Invoice-${(order.invoiceNumber ?? order.orderNumber).replace(/\//g, "-")}.pdf`, content: pdf }],
    });
    return;
  }

  // WhatsApp
  if (!a?.phone) throw new Error("Order has no phone number");
  await sendOrderWhatsApp({
    toPhone10: a.phone,
    customerName: a.fullName ?? "there",
    orderNumber: order.orderNumber,
    packingCode: order.packingCode ?? "",
    totalText: formatPaise(order.totalPaise).replace(/ /g, " "),
    invoiceLink: signedInvoiceLink(order._id.toString()),
    invoiceFilename: `Invoice-${order.orderNumber}.pdf`,
  });
}
