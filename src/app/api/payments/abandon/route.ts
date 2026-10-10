import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import Order from "@/models/Order";
import { getSessionUser } from "@/lib/session";
import { cancelUnpaidOrder } from "@/lib/services/order.service";

const schema = z.object({ orderId: z.string().regex(/^[a-f\d]{24}$/i) });

// Called when the customer closes the Razorpay window without paying: frees the reserved stock.
// If a payment still lands later, finalizePaidOrder re-reserves stock or refunds automatically.
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid order" }, { status: 400 });

  await connectDB();
  const order = await Order.findById(parsed.data.orderId).select("userId paymentStatus");
  if (!order || order.userId.toString() !== user.id) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (order.paymentStatus === "paid") return NextResponse.json({ ok: true, status: "paid" });

  await cancelUnpaidOrder(parsed.data.orderId, "Customer closed payment window");
  return NextResponse.json({ ok: true });
}
