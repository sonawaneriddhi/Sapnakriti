import { NextResponse } from "next/server";
import { getProducts } from "@/lib/services/product.service";
import { CATEGORY_SLUGS } from "@/lib/config";

export const dynamic = "force-dynamic";

// Public catalogue search (used by the navbar search suggestions).
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const q = sp.get("q")?.trim() ?? "";
  const category = sp.get("category") ?? undefined;
  const limit = Math.min(Number(sp.get("limit")) || 8, 24);
  if (category && !(CATEGORY_SLUGS as readonly string[]).includes(category)) {
    return NextResponse.json({ error: "Unknown category" }, { status: 400 });
  }
  const products = await getProducts({ q: q || undefined, category, limit });
  return NextResponse.json({ products });
}
