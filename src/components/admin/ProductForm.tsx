"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { ImagePlus, Star, X } from "lucide-react";
import { CATEGORIES } from "@/lib/config";

export interface ProductFormValues {
  name: string;
  description: string;
  category: string;
  priceRupees: string;
  compareAtRupees: string;
  stockQuantity: string;
  lowStockThreshold: string;
  images: { url: string; publicId: string; alt: string }[];
  isActive: boolean;
  isFeatured: boolean;
  isMostAdored: boolean;
  tags: string;
}

export const emptyProduct: ProductFormValues = {
  name: "",
  description: "",
  category: "candles",
  priceRupees: "",
  compareAtRupees: "",
  stockQuantity: "0",
  lowStockThreshold: "3",
  images: [],
  isActive: true,
  isFeatured: false,
  isMostAdored: false,
  tags: "",
};

export default function ProductForm({ productId, initial, reserved = 0 }: { productId?: string; initial: ProductFormValues; reserved?: number }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [v, setV] = useState<ProductFormValues>(initial);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const set = <K extends keyof ProductFormValues>(k: K, val: ProductFormValues[K]) => setV((p) => ({ ...p, [k]: val }));

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setError("");
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Upload failed");
        break;
      }
      setV((p) => ({ ...p, images: [...p.images, { url: data.url, publicId: data.publicId, alt: p.name }] }));
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const price = Number(v.priceRupees);
    if (!(price > 0)) return setError("Enter a price greater than 0");
    setSaving(true);
    const payload = {
      name: v.name,
      description: v.description,
      category: v.category,
      priceRupees: price,
      compareAtRupees: v.compareAtRupees ? Number(v.compareAtRupees) : null,
      stockQuantity: Math.max(0, Math.floor(Number(v.stockQuantity) || 0)),
      lowStockThreshold: Math.max(0, Math.floor(Number(v.lowStockThreshold) || 0)),
      images: v.images,
      isActive: v.isActive,
      isFeatured: v.isFeatured,
      isMostAdored: v.isMostAdored,
      tags: v.tags.split(",").map((t) => t.trim()).filter(Boolean),
    };
    const res = await fetch(productId ? `/api/admin/products/${productId}` : "/api/admin/products", {
      method: productId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Could not save product");
      setSaving(false);
      return;
    }
    router.push("/admin/products");
    router.refresh();
  }

  async function archive() {
    if (!productId || !confirm("Archive this product? It will be hidden from the shop but kept for order history.")) return;
    await fetch(`/api/admin/products/${productId}`, { method: "DELETE" });
    router.push("/admin/products");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="mt-8 grid gap-8 xl:grid-cols-[1fr_320px]">
      <div className="space-y-5">
        <div>
          <label htmlFor="name" className="field-label">Product name</label>
          <input id="name" required minLength={2} value={v.name} onChange={(e) => set("name", e.target.value)} className="field" />
        </div>
        <div>
          <label htmlFor="description" className="field-label">Description</label>
          <textarea id="description" rows={6} value={v.description} onChange={(e) => set("description", e.target.value)} className="field" />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="category" className="field-label">Category</label>
            <select id="category" value={v.category} onChange={(e) => set("category", e.target.value)} className="field">
              {CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="tags" className="field-label">Tags (comma separated)</label>
            <input id="tags" value={v.tags} onChange={(e) => set("tags", e.target.value)} placeholder="gift, soy, floral" className="field" />
          </div>
          <div>
            <label htmlFor="price" className="field-label">Price (₹)</label>
            <input id="price" required type="number" min="1" step="0.01" inputMode="decimal" value={v.priceRupees} onChange={(e) => set("priceRupees", e.target.value)} className="field" />
          </div>
          <div>
            <label htmlFor="compare" className="field-label">Compare-at price (₹, optional)</label>
            <input id="compare" type="number" min="1" step="0.01" inputMode="decimal" value={v.compareAtRupees} onChange={(e) => set("compareAtRupees", e.target.value)} className="field" />
          </div>
          <div>
            <label htmlFor="stock" className="field-label">Stock quantity</label>
            <input id="stock" required type="number" min="0" step="1" value={v.stockQuantity} onChange={(e) => set("stockQuantity", e.target.value)} className="field" />
            {reserved > 0 && <p className="mt-1 text-xs text-espresso/60">{reserved} currently reserved by open checkouts.</p>}
          </div>
          <div>
            <label htmlFor="low" className="field-label">Low-stock alert at</label>
            <input id="low" type="number" min="0" step="1" value={v.lowStockThreshold} onChange={(e) => set("lowStockThreshold", e.target.value)} className="field" />
          </div>
        </div>

        <fieldset className="border border-sand p-4">
          <legend className="px-2 text-xs uppercase tracking-[0.16em] text-olive">Images</legend>
          <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {v.images.map((img, i) => (
              <li key={img.publicId || img.url} className="relative aspect-square bg-sand/40">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt="" className="h-full w-full object-cover" />
                <button type="button" aria-label="Remove image" onClick={() => set("images", v.images.filter((_, n) => n !== i))} className="absolute right-1 top-1 bg-espresso/80 p-1 text-ivory">
                  <X size={14} />
                </button>
                {i === 0 ? (
                  <span className="absolute bottom-1 left-1 bg-terracotta px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-ivory">Cover</span>
                ) : (
                  <button type="button" aria-label="Make cover image" onClick={() => set("images", [img, ...v.images.filter((_, n) => n !== i)])} className="absolute bottom-1 left-1 bg-ivory/90 p-1 text-olive">
                    <Star size={13} />
                  </button>
                )}
              </li>
            ))}
            <li>
              <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading || v.images.length >= 8} className="flex aspect-square w-full flex-col items-center justify-center gap-1 border border-dashed border-olive text-xs text-olive hover:bg-sand/30 disabled:opacity-50">
                <ImagePlus size={22} />
                {uploading ? "Uploading…" : "Add image"}
              </button>
            </li>
          </ul>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple hidden onChange={(e) => upload(e.target.files)} />
          <p className="mt-2 text-xs text-espresso/60">JPG, PNG or WebP up to 5 MB each. The first image is the cover.</p>
        </fieldset>
      </div>

      <aside className="h-fit space-y-4 border border-sand bg-white/60 p-5">
        <h2 className="text-2xl">Visibility</h2>
        {([
          ["isActive", "Active (visible in the shop)"],
          ["isFeatured", "Featured products section"],
          ["isMostAdored", "Most adored section"],
        ] as const).map(([k, label]) => (
          <label key={k} className="flex items-center gap-3 text-sm">
            <input type="checkbox" checked={v[k]} onChange={(e) => set(k, e.target.checked)} className="h-4 w-4 accent-olive" />
            {label}
          </label>
        ))}
        {error && <p role="alert" className="text-sm text-terracotta">{error}</p>}
        <button disabled={saving || uploading} className="btn-primary w-full">{saving ? "Saving…" : productId ? "Save changes" : "Add product"}</button>
        {productId && (
          <button type="button" onClick={archive} className="w-full text-xs uppercase tracking-[0.18em] text-terracotta hover:underline">
            Archive product
          </button>
        )}
      </aside>
    </form>
  );
}
