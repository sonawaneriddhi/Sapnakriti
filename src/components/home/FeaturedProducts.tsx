import Link from "next/link";
import { getProducts } from "@/lib/services/product.service";
import ProductGrid from "@/components/products/ProductGrid";

export default async function FeaturedProducts() {
  // Admin-flagged products first; if none are flagged yet, fall back to the newest products
  // so the section is never a broken or empty block. Hidden only when the shop has no products.
  let products = await getProducts({ featured: true, limit: 8 });
  if (products.length === 0) products = await getProducts({ limit: 8 });
  if (products.length === 0) return null;

  return (
    <section className="container-page py-20" aria-labelledby="featured-title">
      <div className="mb-10 text-center">
        <p className="eyebrow">Fresh from our hands</p>
        <h2 id="featured-title" className="mt-3 text-4xl sm:text-5xl">
          Featured Products
        </h2>
      </div>
      <ProductGrid products={products} />
      <div className="mt-12 text-center">
        <Link href="/search?q=" className="btn-outline">
          View all
        </Link>
      </div>
    </section>
  );
}
