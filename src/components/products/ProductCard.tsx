import Link from "next/link";
import type { PublicProduct } from "@/lib/services/product.service";
import { formatPaise } from "@/lib/utils";
import AddToCartButton from "@/components/products/AddToCartButton";

export default function ProductCard({ product }: { product: PublicProduct }) {
  const soldOut = product.available <= 0;
  const img = product.images[0];
  const onSale = product.compareAtPricePaise && product.compareAtPricePaise > product.pricePaise;

  return (
    <article className="group flex flex-col">
      <Link href={`/products/${product.slug}`} className="relative block aspect-[4/5] overflow-hidden bg-sand/40">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={img.url}
            alt={img.alt || product.name}
            loading="lazy"
            className={`h-full w-full object-cover transition duration-700 group-hover:scale-105 ${soldOut ? "opacity-60" : ""}`}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-sand/60 to-sage/30">
            <span className="font-serif text-6xl text-olive/40">S</span>
          </div>
        )}
        {soldOut && (
          <span className="absolute left-3 top-3 bg-espresso px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-ivory">Out of Stock</span>
        )}
        {!soldOut && onSale && (
          <span className="absolute left-3 top-3 bg-terracotta px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-ivory">Sale</span>
        )}
      </Link>
      <div className="mt-4 flex flex-1 flex-col">
        <h3 className="font-serif text-xl leading-snug">
          <Link href={`/products/${product.slug}`} className="hover:text-terracotta">
            {product.name}
          </Link>
        </h3>
        <p className="mt-1 text-sm text-olive">
          {formatPaise(product.pricePaise)}
          {onSale && <span className="ml-2 text-espresso/40 line-through">{formatPaise(product.compareAtPricePaise as number)}</span>}
        </p>
        {!soldOut && product.available <= 3 && <p className="mt-1 text-xs text-terracotta">Only {product.available} left</p>}
        <div className="mt-4 pt-1 sm:mt-auto">
          <AddToCartButton productId={product.id} available={product.available} compact className="btn-outline w-full !py-2.5 !text-xs" />
        </div>
      </div>
    </article>
  );
}
