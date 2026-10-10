"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

export interface InventoryRow {
  id: string;
  name: string;
  isActive: boolean;
  stockQuantity: number;
  reservedQuantity: number;
  lowStockThreshold: number;
}

function Row({ row }: { row: InventoryRow }) {
  const router = useRouter();
  const [qty, setQty] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const available = Math.max(0, row.stockQuantity - row.reservedQuantity);

  async function apply(mode: "restock" | "set") {
    const n = Number(qty);
    if (!Number.isInteger(n) || n < 0 || (mode === "restock" && n === 0)) return setMsg("Enter a whole number");
    setBusy(true);
    setMsg("");
    const res = await fetch("/api/admin/inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: row.id, mode, quantity: n, reason: mode === "restock" ? "Restock" : "Stock count" }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setMsg(data.error ?? "Failed");
    setQty("");
    router.refresh();
  }

  return (
    <tr className={row.isActive ? "" : "opacity-50"}>
      <td className="p-3 font-medium">{row.name}{!row.isActive && <span className="ml-2 text-xs uppercase text-espresso/50">archived</span>}</td>
      <td className="p-3">{row.stockQuantity}</td>
      <td className="p-3">{row.reservedQuantity}</td>
      <td className="p-3">
        {available === 0 ? (
          <span className="font-medium text-terracotta">Out of stock</span>
        ) : available <= row.lowStockThreshold ? (
          <span className="text-terracotta">{available} · low</span>
        ) : (
          available
        )}
      </td>
      <td className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <input value={qty} onChange={(e) => setQty(e.target.value)} inputMode="numeric" aria-label={`Quantity for ${row.name}`} placeholder="Qty" className="field !w-20 !py-1.5" />
          <button disabled={busy} onClick={() => apply("restock")} className="border border-olive px-3 py-1.5 text-xs uppercase tracking-wider text-olive hover:bg-olive hover:text-ivory disabled:opacity-50">+ Add</button>
          <button disabled={busy} onClick={() => apply("set")} className="border border-sand px-3 py-1.5 text-xs uppercase tracking-wider hover:bg-sand/50 disabled:opacity-50">Set to</button>
        </div>
        {msg && <p className="mt-1 text-xs text-terracotta">{msg}</p>}
      </td>
    </tr>
  );
}

export default function InventoryTable({ rows }: { rows: InventoryRow[] }) {
  const [q, setQ] = useState("");
  const [only, setOnly] = useState<"all" | "low" | "out">("all");
  const shown = useMemo(
    () =>
      rows.filter((r) => {
        const avail = r.stockQuantity - r.reservedQuantity;
        if (only === "out" && avail > 0) return false;
        if (only === "low" && !(avail > 0 && avail <= r.lowStockThreshold)) return false;
        return r.name.toLowerCase().includes(q.toLowerCase());
      }),
    [rows, q, only]
  );

  return (
    <div className="mt-6">
      <div className="flex flex-wrap gap-3">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products…" aria-label="Search inventory" className="field max-w-xs !py-2" />
        <select value={only} onChange={(e) => setOnly(e.target.value as typeof only)} aria-label="Stock filter" className="field w-auto !py-2">
          <option value="all">All stock levels</option>
          <option value="low">Low stock</option>
          <option value="out">Out of stock</option>
        </select>
      </div>
      <div className="mt-5 overflow-x-auto border border-sand">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-sand/40 text-xs uppercase tracking-[0.14em] text-olive">
            <tr>
              <th className="p-3">Product</th>
              <th className="p-3">On hand</th>
              <th className="p-3">Reserved</th>
              <th className="p-3">Available</th>
              <th className="p-3">Adjust</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sand">
            {shown.map((r) => <Row key={r.id} row={r} />)}
            {shown.length === 0 && (
              <tr><td colSpan={5} className="p-8 text-center text-espresso/60">Nothing to show.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
