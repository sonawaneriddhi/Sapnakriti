import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Payment from "@/models/Payment";
import { verifyWebhookSignature } from "@/lib/integrations/razorpay";
import { confirmPayment } from "@/lib/services/payment.service";

export const dynamic = "force-dynamic";

type RazorpayEvent = {
  event: string;
  payload?: { payment?: { entity?: { id?: string; order_id?: string } } };
};

export async function POST(req: Request) {
  // The signature is computed over the exact bytes Razorpay sent, so read the RAW body.
  // Do not call req.json() before verifying.
  const rawBody = await req.text();
  const signature = req.headers.get("x-razorpay-signature");
  if (!signature) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  let valid = false;
  try {
    valid = verifyWebhookSignature(rawBody, signature);
  } catch (err) {
    console.error("Webhook secret not configured", err);
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }
  if (!valid) return NextResponse.json({ error: "Invalid signature" }, { status: 400 });

  let event: RazorpayEvent;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Bad payload" }, { status: 400 });
  }

  const eventId = req.headers.get("x-razorpay-event-id") ?? "";
  const entity = event.payload?.payment?.entity;
  const razorpayOrderId = entity?.order_id;
  const razorpayPaymentId = entity?.id;
  if (!razorpayOrderId || !razorpayPaymentId) return NextResponse.json({ ok: true, ignored: true });

  await connectDB();

  // Duplicate delivery of the same event: acknowledge and do nothing.
  if (eventId && (await Payment.exists({ razorpayOrderId, webhookEventIds: eventId }))) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  try {
    if (event.event === "payment.captured" || event.event === "order.paid" || event.event === "payment.authorized") {
      await confirmPayment(razorpayOrderId, razorpayPaymentId);
    } else if (event.event === "payment.failed") {
      // The customer can retry inside the same Razorpay window, so don't cancel the order here;
      // the reservation simply expires if they never pay.
      await Payment.updateOne({ razorpayOrderId, status: { $ne: "captured" } }, { $set: { status: "failed" } });
    }
    // Record the event only after it was handled, so a failed attempt gets retried by Razorpay.
    if (eventId) await Payment.updateOne({ razorpayOrderId }, { $addToSet: { webhookEventIds: eventId } });
  } catch (err) {
    console.error("Webhook processing error", err);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
