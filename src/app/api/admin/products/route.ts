import { NextResponse } from "next/server";
import crypto from "crypto";
import { connectDB } from "@/lib/db";
import Product from "@/models/Product";
import { requireAdminApi } from "@/lib/session";
import { productInputSchema, firstError } from "@/lib/validations";
import { slugify } from "@/lib/utils";
import { adjustStock } from "@/lib/services/inventory.service";

export async function GET() {
  const admin = await requireAdminApi();
  if (!admin.ok) return admin.res;
  await connectDB();
  const products = await Product.find().sort({ createdAt: -1 }).lean();
  return NextResponse.json({ products });
}

export async function POST(req: Request) {
  const admin = await requireAdminApi();
  if (!admin.ok) return admin.res;

  const parsed = productInputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: firstError(parsed.error) }, { status: 400 });
  const d = parsed.data;

  await connectDB();
  const base = slugify(d.name) || "product";
  let slug = base;
  if (await Product.exists({ slug })) slug = `${base}-${crypto.randomBytes(2).toString("hex")}`;

  const product = await Product.create({
    name: d.name,
    slug,
    description: d.description,
    category: d.category,
    pricePaise: Math.round(d.priceRupees * 100),
    compareAtPricePaise: d.compareAtRupees ? Math.round(d.compareAtRupees * 100) : undefined,
    images: d.images.map((i) => ({ ...i, alt: i.alt || d.name })),
    stockQuantity: 0,
    reservedQuantity: 0,
    lowStockThreshold: d.lowStockThreshold,
    isActive: d.isActive,
    isFeatured: d.isFeatured,
    isMostAdored: d.isMostAdored,
    tags: d.tags,
  });

  // Initial stock goes through the inventory service so it appears in the audit log.
  if (d.stockQuantity > 0) {
    await adjustStock({ productId: product._id.toString(), mode: "restock", quantity: d.stockQuantity, reason: "Initial stock", actor: admin.user.id });
  }
  return NextResponse.json({ id: product._id.toString(), slug }, { status: 201 });
}
