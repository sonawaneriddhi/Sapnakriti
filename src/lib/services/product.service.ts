import { connectDB } from "@/lib/db";
import Product from "@/models/Product";
import Review from "@/models/Review";
import { serialize } from "@/lib/utils";

export interface PublicProduct {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  pricePaise: number;
  compareAtPricePaise?: number;
  images: { url: string; alt?: string }[];
  available: number;
  tags: string[];
}

type ProductLike = {
  _id: unknown;
  name: string;
  slug: string;
  description?: string | null;
  category: string;
  pricePaise: number;
  compareAtPricePaise?: number | null;
  images?: { url?: string | null; alt?: string | null }[];
  stockQuantity: number;
  reservedQuantity: number;
  tags?: string[];
};

/** Shape sent to the storefront: no reserved counts, no admin-only flags, just what a shopper needs. */
export function toPublic(p: ProductLike): PublicProduct {
  return {
    id: String(p._id),
    name: p.name,
    slug: p.slug,
    description: p.description ?? "",
    category: p.category,
    pricePaise: p.pricePaise,
    compareAtPricePaise: p.compareAtPricePaise ?? undefined,
    images: (p.images ?? []).filter((i) => i.url).map((i) => ({ url: i.url as string, alt: i.alt ?? p.name })),
    available: Math.max(0, p.stockQuantity - p.reservedQuantity),
    tags: p.tags ?? [],
  };
}

export async function getProducts(opts: {
  category?: string;
  featured?: boolean;
  mostAdored?: boolean;
  q?: string;
  limit?: number;
}) {
  await connectDB();
  const filter: Record<string, unknown> = { isActive: true };
  if (opts.category) filter.category = opts.category;
  if (opts.featured) filter.isFeatured = true;
  if (opts.mostAdored) filter.isMostAdored = true;
  if (opts.q) {
    const safe = opts.q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").slice(0, 60);
    const rx = new RegExp(safe, "i");
    filter.$or = [{ name: rx }, { tags: rx }, { description: rx }];
  }
  const docs = await Product.find(filter)
    .sort({ createdAt: -1 })
    .limit(opts.limit ?? 48)
    .lean();
  return serialize(docs.map(toPublic));
}

export async function getProductBySlug(slug: string) {
  await connectDB();
  const doc = await Product.findOne({ slug, isActive: true }).lean();
  return doc ? serialize(toPublic(doc)) : null;
}

export async function getApprovedReviews(limit = 6) {
  await connectDB();
  const docs = await Review.find({ isApproved: true }).sort({ createdAt: -1 }).limit(limit).lean();
  return serialize(
    docs.map((r) => ({ id: String(r._id), customerName: r.customerName, rating: r.rating, message: r.message }))
  );
}
