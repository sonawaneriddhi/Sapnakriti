import type { Metadata } from "next";
import Link from "next/link";
import { connectDB } from "@/lib/db";
import Order from "@/models/Order";
import User from "@/models/User";
import { requireUserPage } from "@/lib/session";
import { formatDate, formatPaise } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "My account" };

export default async function AccountPage() {
  const sessionUser = await requireUserPage("/account");
  await connectDB();
  const [user, orders] = await Promise.all([
    User.findById(sessionUser.id).lean(),
    Order.find({ userId: sessionUser.id, paymentStatus: { $in: ["paid", "refunded"] } }).sort({ createdAt: -1 }).limit(50).lean(),
  ]);

  return (
    <div className="container-page max-w-4xl py-14">
      <p className="eyebrow">My account</p>
      <h1 className="mt-3 text-5xl">Hello, {user?.name?.split(" ")[0] ?? "friend"}</h1>
      <p className="mt-2 text-espresso/60">{user?.email}</p>

      <h2 className="mt-14 text-3xl">Your orders</h2>
      {orders.length === 0 ? (
        <div className="mt-6 border border-sand p-10 text-center">
          <p className="font-serif text-xl text-espresso/70">No orders yet.</p>
          <Link href="/" className="btn-outline mt-5">Start shopping</Link>
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-sand border-y border-sand">
          {orders.map((o) => (
            <li key={String(o._id)}>
              <Link href={`/orders/${o._id}`} className="flex flex-wrap items-center justify-between gap-3 py-5 hover:bg-sand/20">
                <span>
                  <span className="font-serif text-xl">{o.orderNumber}</span>
                  <span className="block text-sm text-espresso/60">{formatDate(o.createdAt)} · {o.items.length} item{o.items.length > 1 ? "s" : ""}</span>
                </span>
                <span className="text-right">
                  <span className="block">{formatPaise(o.totalPaise)}</span>
                  <span className="text-xs uppercase tracking-[0.18em] text-olive">{o.paymentStatus === "refunded" ? "Refunded" : o.orderStatus.replace("_", " ")}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
