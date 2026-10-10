import Link from "next/link";
import ProductForm, { emptyProduct } from "@/components/admin/ProductForm";

export const metadata = { title: "New product" };

export default function NewProductPage() {
  return (
    <div>
      <Link href="/admin/products" className="text-xs uppercase tracking-[0.2em] text-olive hover:text-terracotta">← Products</Link>
      <h1 className="mt-3 text-4xl">Add product</h1>
      <ProductForm initial={emptyProduct} />
    </div>
  );
}
