import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Order from "@/models/Order";
import Payment from "@/models/Payment";
import Notification from "@/models/Notification";
import { requireAdminApi } from "@/lib/session";
import { orderUpdateSchema, firstError } from "@/lib/validations";
import { updateFulfilment } from "@/lib/services/order.service";

const validId = (id: string) => /^[a-f\d]{24}$/i.test(id);

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminApi();
  if (!admin.ok) return admin.res;
  const { id } = await params;
  if (!validId(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await connectDB();
  const [order, payment, notifications] = await Promise.all([
    Order.findById(id).lean(),
    Payment.findOne({ orderId: id }).lean(),
    Notification.find({ orderId: id }).lean(),
  ]);
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ order, payment, notifications });
}

// Fulfilment only: status moves forward, courier details can be edited. Payment status is never changed here.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminApi();
  if (!admin.ok) return admin.res;
  const { id } = await params;
  if (!validId(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = orderUpdateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: firstError(parsed.error) }, { status: 400 });

  try {
    const order = await updateFulfilment(id, parsed.data);
    return NextResponse.json({ orderStatus: order?.orderStatus, courierName: order?.courierName, courierTrackingNumber: order?.courierTrackingNumber });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Could not update order" }, { status: 409 });
  }
}
