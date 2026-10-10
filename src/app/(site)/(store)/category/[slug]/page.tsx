import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CATEGORIES } from "@/lib/config";
import { getProducts } from "@/lib/services/product.service";
import ProductGrid from "@/components/products/ProductGrid";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const cat = CATEGORIES.find((c) => c.slug === slug);
  return { title: cat?.label ?? "Shop" };
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const cat = CATEGORIES.find((c) => c.slug === slug);
  if (!cat) notFound();
  const products = await getProducts({ category: cat.slug, limit: 60 });

  return (
    <div className="container-page py-14">
      <header className="mb-12 text-center">
        <p className="eyebrow">Shop</p>
        <h1 className="mt-3 text-5xl sm:text-6xl">{cat.label}</h1>
        <p className="mx-auto mt-4 max-w-xl text-espresso/70">{cat.blurb}</p>
      </header>
      <ProductGrid products={products} empty="New pieces are being made. Please check back soon." />
    </div>
  );
}
