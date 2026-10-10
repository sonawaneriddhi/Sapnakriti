"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export interface ReviewRow {
  id: string;
  customerName: string;
  rating: number;
  message: string;
  isApproved: boolean;
  createdAt: string;
}

export default function ReviewsTable({ rows }: { rows: ReviewRow[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState("");

  async function setApproved(id: string, isApproved: boolean) {
    setBusy(id);
    await fetch(`/api/admin/reviews/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isApproved }) });
    setBusy("");
    router.refresh();
  }
  async function remove(id: string) {
    if (!confirm("Delete this review permanently?")) return;
    setBusy(id);
    await fetch(`/api/admin/reviews/${id}`, { method: "DELETE" });
    setBusy("");
    router.refresh();
  }

  if (rows.length === 0) return <p className="mt-8 text-espresso/60">No reviews yet.</p>;

  return (
    <ul className="mt-6 divide-y divide-sand border-y border-sand">
      {rows.map((r) => (
        <li key={r.id} className="flex flex-wrap items-start justify-between gap-4 py-5">
          <div className="max-w-xl">
            <p className="text-sm">
              <b>{r.customerName}</b> · {"★".repeat(r.rating)}
              <span className="text-sand">{"★".repeat(5 - r.rating)}</span>
              <span className={`ml-3 text-xs uppercase tracking-wider ${r.isApproved ? "text-olive" : "text-terracotta"}`}>{r.isApproved ? "Published" : "Pending"}</span>
            </p>
            <p className="mt-2 text-espresso/80">{r.message}</p>
          </div>
          <div className="flex gap-2">
            <button disabled={busy === r.id} onClick={() => setApproved(r.id, !r.isApproved)} className="btn-outline !px-4 !py-2 !text-xs">
              {r.isApproved ? "Unpublish" : "Approve"}
            </button>
            <button disabled={busy === r.id} onClick={() => remove(r.id)} className="border border-terracotta px-4 py-2 text-xs uppercase tracking-wider text-terracotta hover:bg-terracotta hover:text-ivory">
              Delete
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
