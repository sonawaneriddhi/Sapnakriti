import Link from "next/link";
import { connectDB } from "@/lib/db";
import Order from "@/models/Order";
import { formatDate, formatPaise } from "@/lib/utils";

export const metadata = { title: "Orders" };

const FILTERS = [
  { key: "all", label: "Paid orders" },
  { key: "confirmed", label: "To process" },
  { key: "processing", label: "Processing" },
  { key: "packed", label: "Packed" },
  { key: "shipped", label: "Shipped" },
  { key: "delivered", label: "Delivered" },
  { key: "unpaid", label: "Unpaid / cancelled" },
] as const;

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const { status = "all", q = "" } = await searchParams;
  await connectDB();

  const filter: Record<string, unknown> =
    status === "unpaid"
      ? { paymentStatus: { $ne: "paid" } }
      : status === "all"
      ? { paymentStatus: "paid" }
      : { paymentStatus: "paid", orderStatus: status };

  const term = q.trim().slice(0, 60);
  if (term) {
    const rx = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ orderNumber: rx }, { packingCode: rx }, { "deliveryAddress.fullName": rx }, { "deliveryAddress.phone": rx }, { "deliveryAddress.email": rx }];
  }

  const orders = await Order.find(filter).sort({ createdAt: -1 }).limit(100).lean();

  return (
    <div>
      <h1 className="text-4xl">Orders</h1>

      <form className="mt-6 flex flex-wrap gap-3" role="search">
        <input name="q" defaultValue={term} placeholder="Search order no, packing code, name, phone…" aria-label="Search orders" className="field max-w-sm !py-2" />
        {status !== "all" && <input type="hidden" name="status" value={status} />}
        <button className="btn-outline !py-2">Search</button>
      </form>

      <div className="mt-5 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={`/admin/orders?status=${f.key}${term ? `&q=${encodeURIComponent(term)}` : ""}`}
            className={`border px-3 py-1.5 text-xs uppercase tracking-[0.14em] ${status === f.key ? "border-olive bg-olive text-ivory" : "border-sand hover:bg-sand/40"}`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <div className="mt-5 overflow-x-auto border border-sand">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-sand/40 text-xs uppercase tracking-[0.14em] text-olive">
            <tr><th className="p-3">Order</th><th className="p-3">Customer</th><th className="p-3">Date</th><th className="p-3">Total</th><th className="p-3">Payment</th><th className="p-3">Status</th></tr>
          </thead>
          <tbody className="divide-y divide-sand">
            {orders.map((o) => (
              <tr key={String(o._id)} className="hover:bg-sand/20">
                <td className="p-3">
                  <Link href={`/admin/orders/${o._id}`} className="font-medium hover:text-terracotta">{o.orderNumber}</Link>
                  {o.packingCode && <span className="block text-xs text-espresso/60">{o.packingCode}</span>}
                </td>
                <td className="p-3">{o.deliveryAddress?.fullName}<span className="block text-xs text-espresso/60">{o.deliveryAddress?.phone}</span></td>
                <td className="p-3 whitespace-nowrap text-xs">{formatDate(o.createdAt)}</td>
                <td className="p-3">{formatPaise(o.totalPaise)}</td>
                <td className="p-3 text-xs uppercase tracking-wider">{o.paymentStatus}</td>
                <td className="p-3 text-xs uppercase tracking-wider">{o.orderStatus.replace("_", " ")}</td>
              </tr>
            ))}
            {orders.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-espresso/60">No orders found.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
