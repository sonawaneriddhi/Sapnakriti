import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductBySlug, getProducts } from "@/lib/services/product.service";
import { categoryLabel } from "@/lib/config";
import { formatPaise } from "@/lib/utils";
import ProductGallery from "@/components/products/ProductGallery";
import ProductPurchase from "@/components/products/ProductPurchase";
import ProductGrid from "@/components/products/ProductGrid";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProductBySlug(slug);
  return p ? { title: p.name, description: p.description.slice(0, 160) } : { title: "Product" };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const related = (await getProducts({ category: product.category, limit: 5 })).filter((p) => p.id !== product.id).slice(0, 4);
  const onSale = product.compareAtPricePaise && product.compareAtPricePaise > product.pricePaise;

  return (
    <div className="container-page py-12">
      <nav aria-label="Breadcrumb" className="mb-8 text-xs uppercase tracking-[0.2em] text-espresso/60">
        <Link href="/" className="hover:text-terracotta">Home</Link> /{" "}
        <Link href={`/category/${product.category}`} className="hover:text-terracotta">{categoryLabel(product.category)}</Link>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
        <ProductGallery images={product.images} name={product.name} />
        <div>
          <p className="eyebrow">{categoryLabel(product.category)}</p>
          <h1 className="mt-3 text-4xl leading-tight sm:text-5xl">{product.name}</h1>
          <p className="mt-4 text-2xl text-olive">
            {formatPaise(product.pricePaise)}
            {onSale && <span className="ml-3 text-lg text-espresso/40 line-through">{formatPaise(product.compareAtPricePaise as number)}</span>}
          </p>
          <p className="mt-1 text-xs text-espresso/60">Inclusive of taxes. Shipping calculated at checkout.</p>

          <div className="mt-6 whitespace-pre-line text-lg leading-relaxed text-espresso/80">{product.description}</div>

          <div className="mt-8">
            {product.available === 0 ? (
              <p className="mb-3 font-medium text-terracotta">Currently out of stock</p>
            ) : product.available <= 5 ? (
              <p className="mb-3 text-sm text-terracotta">Only {product.available} left</p>
            ) : null}
            <ProductPurchase productId={product.id} available={product.available} />
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-24" aria-labelledby="related-title">
          <h2 id="related-title" className="mb-8 text-center text-3xl">You may also love</h2>
          <ProductGrid products={related} />
        </section>
      )}
    </div>
  );
}
