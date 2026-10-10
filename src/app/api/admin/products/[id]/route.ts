import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Product from "@/models/Product";
import { requireAdminApi } from "@/lib/session";
import { productInputSchema, firstError } from "@/lib/validations";
import { adjustStock } from "@/lib/services/inventory.service";
import { deleteImage } from "@/lib/integrations/cloudinary";

const validId = (id: string) => /^[a-f\d]{24}$/i.test(id);

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminApi();
  if (!admin.ok) return admin.res;
  const { id } = await params;
  if (!validId(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await connectDB();
  const product = await Product.findById(id).lean();
  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ product });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminApi();
  if (!admin.ok) return admin.res;
  const { id } = await params;
  if (!validId(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = productInputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: firstError(parsed.error) }, { status: 400 });
  const d = parsed.data;

  await connectDB();
  const current = await Product.findById(id);
  if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Stock changes are applied atomically and logged, not blindly overwritten.
  if (d.stockQuantity !== current.stockQuantity) {
    try {
      await adjustStock({ productId: id, mode: "set", quantity: d.stockQuantity, reason: "Edited in product form", actor: admin.user.id });
    } catch (err) {
      return NextResponse.json({ error: err instanceof Error ? err.message : "Could not update stock" }, { status: 409 });
    }
  }

  const keep = new Set(d.images.map((i) => i.publicId));
  const removed = (current.images ?? []).filter((i) => i.publicId && !keep.has(i.publicId));

  await Product.updateOne(
    { _id: id },
    {
      $set: {
        name: d.name,
        description: d.description,
        category: d.category,
        pricePaise: Math.round(d.priceRupees * 100),
        images: d.images.map((i) => ({ ...i, alt: i.alt || d.name })),
        lowStockThreshold: d.lowStockThreshold,
        isActive: d.isActive,
        isFeatured: d.isFeatured,
        isMostAdored: d.isMostAdored,
        tags: d.tags,
        ...(d.compareAtRupees ? { compareAtPricePaise: Math.round(d.compareAtRupees * 100) } : {}),
      },
      ...(d.compareAtRupees ? {} : { $unset: { compareAtPricePaise: "" } }),
    }
  );

  // Clean up replaced images in the background; a failure here must not fail the save.
  await Promise.all(removed.map((i) => deleteImage(i.publicId as string).catch(() => undefined)));
  return NextResponse.json({ ok: true });
}

// "Delete" archives the product (hidden from the shop, kept for order history and reports).
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminApi();
  if (!admin.ok) return admin.res;
  const { id } = await params;
  if (!validId(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await connectDB();
  await Product.updateOne({ _id: id }, { $set: { isActive: false, isFeatured: false, isMostAdored: false } });
  return NextResponse.json({ ok: true });
}
