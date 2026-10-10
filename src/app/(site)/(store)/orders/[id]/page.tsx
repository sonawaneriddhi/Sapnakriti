import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connectDB } from "@/lib/db";
import Order from "@/models/Order";
import { requireUserPage } from "@/lib/session";
import { formatDate, formatPaise } from "@/lib/utils";
import AutoRefresh from "@/components/checkout/AutoRefresh";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Order details" };

const STEPS = ["confirmed", "processing", "packed", "shipped", "delivered"] as const;

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ paid?: string; pending?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const user = await requireUserPage(`/orders/${id}`);
  if (!/^[a-f\d]{24}$/i.test(id)) notFound();

  await connectDB();
  const order = await Order.findOne({ _id: id, userId: user.id }).lean();
  if (!order) notFound();

  const paid = order.paymentStatus === "paid";
  const waiting = !paid && order.paymentStatus === "pending" && !!sp.pending;
  const a = order.deliveryAddress;
  const stepIndex = STEPS.indexOf(order.orderStatus as (typeof STEPS)[number]);

  return (
    <div className="container-page max-w-4xl py-14">
      {waiting && <AutoRefresh />}

      <div className="text-center">
        {paid ? (
          <>
            <p className="eyebrow">{sp.paid ? "Payment received" : "Order"}</p>
            <h1 className="mt-3 text-5xl">{sp.paid ? "Thank you for your order" : `Order ${order.orderNumber}`}</h1>
            {sp.paid && <p className="mt-4 text-espresso/70">Your invoice and packing code are on their way to your email and WhatsApp.</p>}
          </>
        ) : waiting ? (
          <>
            <p className="eyebrow">Almost there</p>
            <h1 className="mt-3 text-5xl">Confirming your payment…</h1>
            <p className="mt-4 text-espresso/70">This usually takes a few seconds. This page will update on its own.</p>
          </>
        ) : (
          <>
            <p className="eyebrow">Order {order.orderNumber}</p>
            <h1 className="mt-3 text-5xl">{order.orderStatus === "cancelled" ? "Order cancelled" : "Payment not completed"}</h1>
            <p className="mt-4 text-espresso/70">
              {order.paymentStatus === "refunded" ? "Your payment has been refunded." : "No payment was taken for this order. If money was deducted, it will be reversed by your bank."}
            </p>
            <Link href="/checkout" className="btn-outline mt-6">Try again</Link>
          </>
        )}
      </div>

      {paid && (
        <>
          <div className="mx-auto mt-10 max-w-md border border-sand bg-white/60 p-6 text-center">
            <p className="text-xs uppercase tracking-[0.25em] text-olive">Your packing code</p>
            <p className="mt-2 font-serif text-4xl tracking-[0.15em]">{order.packingCode}</p>
            <p className="mt-2 text-xs text-espresso/60">Quote this code if you contact us about your delivery.</p>
          </div>

          {stepIndex >= 0 && (
            <ol className="mx-auto mt-10 grid max-w-2xl grid-cols-5 text-center text-[11px] uppercase tracking-[0.12em] sm:text-xs" aria-label="Order progress">
              {STEPS.map((s, i) => (
                <li key={s} className={i <= stepIndex ? "text-olive" : "text-espresso/30"}>
                  <div className={`mx-auto mb-2 h-3 w-3 rounded-full ${i <= stepIndex ? "bg-olive" : "bg-sand"}`} />
                  {s}
                </li>
              ))}
            </ol>
          )}
        </>
      )}

      <div className="mt-12 grid gap-10 md:grid-cols-2">
        <section>
          <h2 className="text-3xl">Items</h2>
          <ul className="mt-4 divide-y divide-sand">
            {order.items.map((i) => (
              <li key={String(i.productId)} className="flex justify-between gap-4 py-3">
                <span>
                  <Link href={`/products/${i.productSlug}`} className="font-serif text-lg hover:text-terracotta">{i.productName}</Link>
                  <span className="block text-sm text-espresso/60">Qty {i.quantity}</span>
                </span>
                <span>{formatPaise(i.lineTotalPaise ?? 0)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-1 border-t border-sand pt-4 text-sm">
            <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatPaise(order.subtotalPaise)}</dd></div>
            <div className="flex justify-between"><dt>Shipping</dt><dd>{order.shippingPaise === 0 ? "Free" : formatPaise(order.shippingPaise)}</dd></div>
            <div className="flex justify-between pt-1 font-serif text-xl"><dt>Total</dt><dd>{formatPaise(order.totalPaise)}</dd></div>
          </dl>
        </section>

        <section>
          <h2 className="text-3xl">Delivery</h2>
          <address className="mt-4 not-italic leading-relaxed text-espresso/80">
            {a?.fullName}<br />
            {a?.line1}{a?.line2 ? `, ${a.line2}` : ""}<br />
            {a?.city}, {a?.state} {a?.postalCode}<br />
            {a?.country}<br />
            {a?.phone}
          </address>
          <p className="mt-4 text-sm text-espresso/60">Placed {formatDate(order.createdAt)}</p>
          {order.courierTrackingNumber && (
            <p className="mt-2 text-sm">Tracking: <b>{order.courierName ? `${order.courierName} · ` : ""}{order.courierTrackingNumber}</b></p>
          )}
          {paid && (
            <a href={`/api/invoices/${order._id}`} target="_blank" rel="noopener" className="btn-outline mt-6">
              Download invoice
            </a>
          )}
        </section>
      </div>
    </div>
  );
}
