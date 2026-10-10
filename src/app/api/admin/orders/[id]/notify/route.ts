import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/session";
import { processNotifications, requeueOrderNotifications } from "@/lib/services/notification.service";

const schema = z.object({ channel: z.enum(["email", "whatsapp"]).optional() });

// Resend the confirmation (invoice + packing code) for a paid order.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminApi();
  if (!admin.ok) return admin.res;
  const { id } = await params;
  if (!/^[a-f\d]{24}$/i.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid channel" }, { status: 400 });

  try {
    await requeueOrderNotifications(id, parsed.data.channel);
    await processNotifications({ orderId: id });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Could not resend" }, { status: 409 });
  }
}
