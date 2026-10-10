import Link from "next/link";
import { notFound } from "next/navigation";
import { connectDB } from "@/lib/db";
import Product from "@/models/Product";
import ProductForm, { type ProductFormValues } from "@/components/admin/ProductForm";

export const metadata = { title: "Edit product" };

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-f\d]{24}$/i.test(id)) notFound();
  await connectDB();
  const p = await Product.findById(id).lean();
  if (!p) notFound();

  const initial: ProductFormValues = {
    name: p.name,
    description: p.description ?? "",
    category: p.category,
    priceRupees: String(p.pricePaise / 100),
    compareAtRupees: p.compareAtPricePaise ? String(p.compareAtPricePaise / 100) : "",
    stockQuantity: String(p.stockQuantity),
    lowStockThreshold: String(p.lowStockThreshold),
    images: (p.images ?? []).map((i) => ({ url: i.url ?? "", publicId: i.publicId ?? "", alt: i.alt ?? "" })),
    isActive: p.isActive,
    isFeatured: p.isFeatured,
    isMostAdored: p.isMostAdored,
    tags: (p.tags ?? []).join(", "),
  };

  return (
    <div>
      <Link href="/admin/products" className="text-xs uppercase tracking-[0.2em] text-olive hover:text-terracotta">← Products</Link>
      <h1 className="mt-3 text-4xl">Edit product</h1>
      <ProductForm productId={id} initial={initial} reserved={p.reservedQuantity} />
    </div>
  );
}
