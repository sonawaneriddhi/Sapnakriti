import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import Product from "@/models/Product";
import { toPublic } from "@/lib/services/product.service";
import { calcShipping } from "@/lib/config";

const schema = z.object({
  items: z
    .array(z.object({ productId: z.string().regex(/^[a-f\d]{24}$/i), quantity: z.number().int().min(1).max(99) }))
    .max(30),
});

// The cart in the browser only stores ids + quantities. This endpoint returns the CURRENT
// price and stock for display. The real totals are recalculated again when the order is created.
export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid cart" }, { status: 400 });

  await connectDB();
  const ids = parsed.data.items.map((i) => i.productId);
  const docs = await Product.find({ _id: { $in: ids }, isActive: true }).lean();
  const byId = new Map(docs.map((d) => [String(d._id), toPublic(d)]));

  const lines = parsed.data.items.flatMap((i) => {
    const product = byId.get(i.productId);
    if (!product) return [];
    const quantity = Math.min(i.quantity, Math.max(product.available, 0));
    return [{ product, requested: i.quantity, quantity }];
  });
  const missing = parsed.data.items.filter((i) => !byId.has(i.productId)).map((i) => i.productId);

  const subtotalPaise = lines.reduce((s, l) => s + l.product.pricePaise * l.quantity, 0);
  const shippingPaise = calcShipping(subtotalPaise);
  return NextResponse.json({ lines, missing, subtotalPaise, shippingPaise, totalPaise: subtotalPaise + shippingPaise });
}
