import Link from "next/link";
import { connectDB } from "@/lib/db";
import Order from "@/models/Order";
import Product from "@/models/Product";
import Notification from "@/models/Notification";
import { formatDate, formatPaise } from "@/lib/utils";

export default async function AdminOverview() {
  await connectDB();
  const [revenueAgg, paidCount, toFulfil, awaitingPayment, lowStock, recent, failedNotes] = await Promise.all([
    Order.aggregate([{ $match: { paymentStatus: "paid" } }, { $group: { _id: null, total: { $sum: "$totalPaise" } } }]),
    Order.countDocuments({ paymentStatus: "paid" }),
    Order.countDocuments({ paymentStatus: "paid", orderStatus: { $in: ["confirmed", "processing", "packed"] } }),
    Order.countDocuments({ paymentStatus: "pending", stockState: "held" }),
    Product.find({ isActive: true, $expr: { $lte: [{ $subtract: ["$stockQuantity", "$reservedQuantity"] }, "$lowStockThreshold"] } })
      .select("name stockQuantity reservedQuantity lowStockThreshold")
      .sort({ stockQuantity: 1 })
      .limit(8)
      .lean(),
    Order.find({ paymentStatus: "paid" }).sort({ paidAt: -1 }).limit(8).lean(),
    Notification.countDocuments({ status: "failed" }),
  ]);

  const stats = [
    { label: "Revenue", value: formatPaise(revenueAgg[0]?.total ?? 0) },
    { label: "Paid orders", value: String(paidCount) },
    { label: "To pack & ship", value: String(toFulfil), href: "/admin/orders?status=confirmed" },
    { label: "Awaiting payment", value: String(awaitingPayment) },
  ];

  return (
    <div>
      <h1 className="text-4xl">Overview</h1>

      <dl className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="border border-sand bg-white/60 p-5">
            <dt className="text-xs uppercase tracking-[0.18em] text-olive">{s.label}</dt>
            <dd className="mt-2 font-serif text-3xl">{s.value}</dd>
          </div>
        ))}
      </dl>

      {failedNotes > 0 && (
        <p className="mt-6 border border-terracotta/40 bg-terracotta/10 p-4 text-sm">
          {failedNotes} order notification{failedNotes > 1 ? "s" : ""} could not be delivered. Open the order to see the error and resend.
        </p>
      )}

      <div className="mt-10 grid gap-8 xl:grid-cols-2">
        <section>
          <h2 className="text-2xl">Low-stock alerts</h2>
          {lowStock.length === 0 ? (
            <p className="mt-3 text-sm text-espresso/60">Everything is comfortably stocked.</p>
          ) : (
            <ul className="mt-3 divide-y divide-sand border-y border-sand">
              {lowStock.map((p) => {
                const avail = Math.max(0, p.stockQuantity - p.reservedQuantity);
                return (
                  <li key={String(p._id)} className="flex items-center justify-between py-3 text-sm">
                    <Link href={`/admin/products/${p._id}`} className="hover:text-terracotta">{p.name}</Link>
                    <span className={avail === 0 ? "font-medium text-terracotta" : "text-olive"}>{avail === 0 ? "Out of stock" : `${avail} left`}</span>
                  </li>
                );
              })}
            </ul>
          )}
          <Link href="/admin/inventory" className="mt-3 inline-block text-xs uppercase tracking-[0.2em] text-terracotta hover:underline">Manage inventory</Link>
        </section>

        <section>
          <h2 className="text-2xl">Recent sales</h2>
          {recent.length === 0 ? (
            <p className="mt-3 text-sm text-espresso/60">No paid orders yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-sand border-y border-sand">
              {recent.map((o) => (
                <li key={String(o._id)}>
                  <Link href={`/admin/orders/${o._id}`} className="flex items-center justify-between py-3 text-sm hover:bg-sand/20">
                    <span>
                      <span className="font-medium">{o.orderNumber}</span>
                      <span className="block text-xs text-espresso/60">{o.deliveryAddress?.fullName} · {formatDate(o.paidAt ?? o.createdAt)}</span>
                    </span>
                    <span>{formatPaise(o.totalPaise)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
