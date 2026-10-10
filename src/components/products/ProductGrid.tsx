import type { PublicProduct } from "@/lib/services/product.service";
import ProductCard from "@/components/products/ProductCard";

export default function ProductGrid({ products, empty = "Nothing here just yet." }: { products: PublicProduct[]; empty?: string }) {
  if (products.length === 0) {
    return <p className="py-16 text-center font-serif text-xl text-espresso/60">{empty}</p>;
  }
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-4">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}
