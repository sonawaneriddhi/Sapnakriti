import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import Review from "@/models/Review";
import { requireAdminApi } from "@/lib/session";

const schema = z.object({ isApproved: z.boolean() });
const validId = (id: string) => /^[a-f\d]{24}$/i.test(id);

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminApi();
  if (!admin.ok) return admin.res;
  const { id } = await params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!validId(id) || !parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  await connectDB();
  await Review.updateOne({ _id: id }, { $set: { isApproved: parsed.data.isApproved } });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminApi();
  if (!admin.ok) return admin.res;
  const { id } = await params;
  if (!validId(id)) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  await connectDB();
  await Review.deleteOne({ _id: id });
  return NextResponse.json({ ok: true });
}
