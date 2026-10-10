import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Order from "@/models/Order";
import { getSessionUser } from "@/lib/session";
import { isAdminRequest } from "@/lib/adminAuth";
import { verifyInvoiceToken } from "@/lib/invoiceToken";
import { generateInvoicePdf } from "@/lib/services/invoice.service";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-f\d]{24}$/i.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await connectDB();
  const order = await Order.findById(id);
  if (!order || order.paymentStatus !== "paid") return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Authorised if: the signed link from the email/WhatsApp message, the order's owner, or an admin.
  const token = new URL(req.url).searchParams.get("token");
  let allowed = verifyInvoiceToken(id, token);
  if (!allowed) {
    const user = await getSessionUser();
    if (user) allowed = user.id === order.userId.toString();
    if (!allowed) allowed = await isAdminRequest();
  }
  if (!allowed) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const pdf = await generateInvoicePdf(order);
  const filename = `Invoice-${(order.invoiceNumber ?? order.orderNumber).replace(/\//g, "-")}.pdf`;
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
