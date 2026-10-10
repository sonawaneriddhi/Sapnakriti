import Link from "next/link";
import { connectDB } from "@/lib/db";
import Product from "@/models/Product";
import ProductsTable, { type AdminProductRow } from "@/components/admin/ProductsTable";

export const metadata = { title: "Products" };

export default async function AdminProductsPage() {
  await connectDB();
  const products = await Product.find().sort({ createdAt: -1 }).lean();
  const rows: AdminProductRow[] = products.map((p) => ({
    id: String(p._id),
    name: p.name,
    category: p.category,
    pricePaise: p.pricePaise,
    stockQuantity: p.stockQuantity,
    reservedQuantity: p.reservedQuantity,
    lowStockThreshold: p.lowStockThreshold,
    isActive: p.isActive,
    isFeatured: p.isFeatured,
    isMostAdored: p.isMostAdored,
    image: p.images?.[0]?.url ?? undefined,
  }));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-4xl">Products</h1>
        <Link href="/admin/products/new" className="btn-primary">Add product</Link>
      </div>
      <ProductsTable rows={rows} />
    </div>
  );
}
