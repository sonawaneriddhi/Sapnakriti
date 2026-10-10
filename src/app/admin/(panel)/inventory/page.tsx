import { connectDB } from "@/lib/db";
import Product from "@/models/Product";
import InventoryLog from "@/models/InventoryLog";
import InventoryTable, { type InventoryRow } from "@/components/admin/InventoryTable";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Inventory" };

export default async function AdminInventoryPage() {
  await connectDB();
  const [products, logs] = await Promise.all([
    Product.find().sort({ name: 1 }).lean(),
    InventoryLog.find().sort({ createdAt: -1 }).limit(40).lean(),
  ]);
  const names = new Map(products.map((p) => [String(p._id), p.name]));

  const rows: InventoryRow[] = products.map((p) => ({
    id: String(p._id),
    name: p.name,
    isActive: p.isActive,
    stockQuantity: p.stockQuantity,
    reservedQuantity: p.reservedQuantity,
    lowStockThreshold: p.lowStockThreshold,
  }));

  return (
    <div>
      <h1 className="text-4xl">Inventory</h1>
      <p className="mt-2 text-sm text-espresso/60">
        Available = on hand − reserved. When available reaches 0 the product shows “Out of Stock” and cannot be added to a cart.
      </p>
      <InventoryTable rows={rows} />

      <h2 className="mt-14 text-2xl">Recent stock history</h2>
      <div className="mt-4 overflow-x-auto border border-sand">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-sand/40 text-xs uppercase tracking-[0.14em] text-olive">
            <tr><th className="p-3">When</th><th className="p-3">Product</th><th className="p-3">Action</th><th className="p-3">Change</th><th className="p-3">Note</th></tr>
          </thead>
          <tbody className="divide-y divide-sand">
            {logs.map((l) => (
              <tr key={String(l._id)}>
                <td className="p-3 whitespace-nowrap text-xs">{formatDate(l.createdAt)}</td>
                <td className="p-3">{names.get(String(l.productId)) ?? "Deleted product"}</td>
                <td className="p-3 uppercase tracking-wider text-xs">{l.action}</td>
                <td className={`p-3 ${l.quantityChange < 0 ? "text-terracotta" : "text-olive"}`}>{l.quantityChange > 0 ? `+${l.quantityChange}` : l.quantityChange}</td>
                <td className="p-3 text-xs text-espresso/70">{l.reason}{l.actorName ? ` · ${l.actorName}` : ""}</td>
              </tr>
            ))}
            {logs.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-espresso/60">No stock movements yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
