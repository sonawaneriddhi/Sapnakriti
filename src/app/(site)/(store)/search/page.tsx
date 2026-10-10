import type { Metadata } from "next";
import { getProducts } from "@/lib/services/product.service";
import ProductGrid from "@/components/products/ProductGrid";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Search" };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const term = q.trim().slice(0, 60);
  const products = await getProducts({ q: term || undefined, limit: 60 });

  return (
    <div className="container-page py-14">
      <header className="mb-12 text-center">
        <p className="eyebrow">{term ? "Search results" : "Everything we make"}</p>
        <h1 className="mt-3 text-4xl sm:text-5xl">{term ? `“${term}”` : "All products"}</h1>
      </header>
      <ProductGrid products={products} empty={term ? `No products found for “${term}”.` : "No products yet."} />
    </div>
  );
}
