import { getProducts } from "@/lib/services/product.service";
import ProductGrid from "@/components/products/ProductGrid";

export default async function MostAdored() {
  // Curated by the admin. Hidden entirely until at least one product is marked "Most adored".
  const products = await getProducts({ mostAdored: true, limit: 4 });
  if (products.length === 0) return null;

  return (
    <section className="container-page py-20" aria-labelledby="adored-title">
      <div className="mb-10 text-center">
        <p className="eyebrow">Loved again and again</p>
        <h2 id="adored-title" className="mt-3 text-4xl sm:text-5xl">
          Most Adored Products
        </h2>
      </div>
      <ProductGrid products={products} />
    </section>
  );
}
