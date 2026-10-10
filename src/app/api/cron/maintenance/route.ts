import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Order from "@/models/Order";
import Payment from "@/models/Payment";
import { getRazorpay } from "@/lib/integrations/razorpay";
import { confirmPayment } from "@/lib/services/payment.service";
import { releaseExpiredReservations } from "@/lib/services/order.service";
import { processNotifications } from "@/lib/services/notification.service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Housekeeping, safe to run as often as you like:
//   1. reconcile payments whose webhook/callback never arrived
//   2. release stock held by abandoned checkouts
//   3. retry failed / due email + WhatsApp notifications
// Vercel Cron sends "Authorization: Bearer $CRON_SECRET" automatically when CRON_SECRET is set.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await connectDB();

  let reconciled = 0;
  const since = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const open = await Order.find({ paymentStatus: { $in: ["pending", "failed"] }, createdAt: { $gte: since } })
    .select("_id")
    .limit(25)
    .lean();
  for (const o of open) {
    try {
      const payment = await Payment.findOne({ orderId: o._id });
      if (!payment) continue;
      const list = await getRazorpay().orders.fetchPayments(payment.razorpayOrderId);
      const good = list.items.find((p: { status: string }) => p.status === "captured" || p.status === "authorized");
      if (good) {
        const r = await confirmPayment(payment.razorpayOrderId, good.id);
        if (r.state === "paid") reconciled++;
      }
    } catch (err) {
      console.error("reconcile error", err);
    }
  }

  const released = await releaseExpiredReservations();
  const notified = await processNotifications({ limit: 50 });
  return NextResponse.json({ reconciled, released, notified });
}
