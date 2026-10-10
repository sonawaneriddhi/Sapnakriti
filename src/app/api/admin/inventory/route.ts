import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Product from "@/models/Product";
import InventoryLog from "@/models/InventoryLog";
import { requireAdminApi } from "@/lib/session";
import { inventoryAdjustSchema, firstError } from "@/lib/validations";
import { adjustStock } from "@/lib/services/inventory.service";

export async function GET() {
  const admin = await requireAdminApi();
  if (!admin.ok) return admin.res;
  await connectDB();
  const [products, logs] = await Promise.all([
    Product.find().select("name slug stockQuantity reservedQuantity lowStockThreshold isActive").sort({ name: 1 }).lean(),
    InventoryLog.find().sort({ createdAt: -1 }).limit(50).lean(),
  ]);
  return NextResponse.json({ products, logs });
}

export async function POST(req: Request) {
  const admin = await requireAdminApi();
  if (!admin.ok) return admin.res;
  const parsed = inventoryAdjustSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: firstError(parsed.error) }, { status: 400 });

  try {
    const product = await adjustStock({ ...parsed.data, actor: admin.user.id });
    if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });
    return NextResponse.json({
      stockQuantity: product.stockQuantity,
      reservedQuantity: product.reservedQuantity,
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Could not update stock" }, { status: 409 });
  }
}
