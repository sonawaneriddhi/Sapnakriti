"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { categoryLabel } from "@/lib/config";
import { formatPaise } from "@/lib/utils";

export interface AdminProductRow {
  id: string;
  name: string;
  category: string;
  pricePaise: number;
  stockQuantity: number;
  reservedQuantity: number;
  lowStockThreshold: number;
  isActive: boolean;
  isFeatured: boolean;
  isMostAdored: boolean;
  image?: string;
}

export default function ProductsTable({ rows }: { rows: AdminProductRow[] }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "archived" | "out">("all");

  const shown = useMemo(
    () =>
      rows.filter((r) => {
        const avail = r.stockQuantity - r.reservedQuantity;
        if (filter === "active" && !r.isActive) return false;
        if (filter === "archived" && r.isActive) return false;
        if (filter === "out" && avail > 0) return false;
        return r.name.toLowerCase().includes(q.toLowerCase());
      }),
    [rows, q, filter]
  );

  return (
    <div className="mt-6">
      <div className="flex flex-wrap gap-3">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products…" aria-label="Search products" className="field max-w-xs !py-2" />
        <select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} aria-label="Filter products" className="field w-auto !py-2">
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="out">Out of stock</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      <div className="mt-5 overflow-x-auto border border-sand">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-sand/40 text-xs uppercase tracking-[0.14em] text-olive">
            <tr>
              <th className="p-3">Product</th>
              <th className="p-3">Category</th>
              <th className="p-3">Price</th>
              <th className="p-3">Available</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sand">
            {shown.map((r) => {
              const avail = Math.max(0, r.stockQuantity - r.reservedQuantity);
              return (
                <tr key={r.id} className="hover:bg-sand/20">
                  <td className="p-3">
                    <Link href={`/admin/products/${r.id}`} className="flex items-center gap-3 hover:text-terracotta">
                      <span className="h-11 w-11 shrink-0 overflow-hidden bg-sand/40">
                        {r.image && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={r.image} alt="" className="h-full w-full object-cover" />
                        )}
                      </span>
                      <span className="font-medium">{r.name}</span>
                    </Link>
                  </td>
                  <td className="p-3">{categoryLabel(r.category)}</td>
                  <td className="p-3">{formatPaise(r.pricePaise)}</td>
                  <td className="p-3">
                    {avail === 0 ? <span className="font-medium text-terracotta">Out of stock</span> : avail <= r.lowStockThreshold ? <span className="text-terracotta">{avail} (low)</span> : avail}
                  </td>
                  <td className="p-3 text-xs uppercase tracking-[0.12em]">
                    {r.isActive ? "Active" : <span className="text-espresso/50">Archived</span>}
                    {r.isFeatured && <span className="ml-2 text-olive">★ Featured</span>}
                    {r.isMostAdored && <span className="ml-2 text-olive">♥ Adored</span>}
                  </td>
                </tr>
              );
            })}
            {shown.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-espresso/60">No products match.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
