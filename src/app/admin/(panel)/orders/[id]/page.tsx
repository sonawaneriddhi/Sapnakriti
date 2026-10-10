import Link from "next/link";
import { notFound } from "next/navigation";
import { connectDB } from "@/lib/db";
import Order from "@/models/Order";
import Payment from "@/models/Payment";
import Notification from "@/models/Notification";
import User from "@/models/User";
import OrderActions from "@/components/admin/OrderActions";
import { formatDate, formatPaise } from "@/lib/utils";

export const metadata = { title: "Order" };

export default async function AdminOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-f\d]{24}$/i.test(id)) notFound();
  await connectDB();
  const order = await Order.findById(id).lean();
  if (!order) notFound();
  const [payment, notes, customer] = await Promise.all([
    Payment.findOne({ orderId: id }).lean(),
    Notification.find({ orderId: id }).lean(),
    User.findById(order.userId).select("name email phone").lean(),
  ]);
  const a = order.deliveryAddress;
  const paid = order.paymentStatus === "paid";

  return (
    <div>
      <Link href="/admin/orders" className="text-xs uppercase tracking-[0.2em] text-olive hover:text-terracotta">← Orders</Link>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-4xl">{order.orderNumber}</h1>
        <div className="flex gap-2 text-xs uppercase tracking-[0.14em]">
          <span className="border border-olive px-3 py-1 text-olive">Payment: {order.paymentStatus}</span>
          <span className="border border-sand px-3 py-1">Status: {order.orderStatus.replace("_", " ")}</span>
        </div>
      </div>
      <p className="mt-1 text-sm text-espresso/60">Placed {formatDate(order.createdAt)}{order.paidAt ? ` · Paid ${formatDate(order.paidAt)}` : ""}</p>

      {paid && (
        <div className="mt-6 flex flex-wrap items-center gap-6 border border-sand bg-white/60 p-5">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-olive">Packing code</p>
            <p className="font-serif text-3xl tracking-[0.12em]">{order.packingCode}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-olive">Invoice</p>
            <p className="text-sm">{order.invoiceNumber}</p>
          </div>
          <a href={`/api/invoices/${order._id}`} target="_blank" rel="noopener" className="btn-outline !py-2 !text-xs">Open invoice PDF</a>
        </div>
      )}

      <div className="mt-8 grid gap-8 xl:grid-cols-2">
        <section>
          <h2 className="text-2xl">Items</h2>
          <ul className="mt-3 divide-y divide-sand border-y border-sand">
            {order.items.map((i) => (
              <li key={String(i.productId)} className="flex items-center gap-3 py-3 text-sm">
                <span className="h-12 w-12 shrink-0 overflow-hidden bg-sand/40">
                  {i.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={i.imageUrl} alt="" className="h-full w-full object-cover" />
                  )}
                </span>
                <span className="flex-1">{i.productName}<span className="block text-xs text-espresso/60">{formatPaise(i.unitPricePaise ?? 0)} × {i.quantity}</span></span>
                <span>{formatPaise(i.lineTotalPaise ?? 0)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-3 space-y-1 text-sm">
            <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatPaise(order.subtotalPaise)}</dd></div>
            <div className="flex justify-between"><dt>Shipping</dt><dd>{order.shippingPaise === 0 ? "Free" : formatPaise(order.shippingPaise)}</dd></div>
            <div className="flex justify-between font-serif text-xl"><dt>Total</dt><dd>{formatPaise(order.totalPaise)}</dd></div>
          </dl>
        </section>

        <section>
          <h2 className="text-2xl">Customer &amp; delivery</h2>
          <address className="mt-3 not-italic leading-relaxed text-sm">
            <b>{a?.fullName}</b><br />
            {a?.line1}{a?.line2 ? `, ${a.line2}` : ""}<br />
            {a?.city}, {a?.state} {a?.postalCode}<br />
            {a?.country}<br />
            <a href={`tel:${a?.phone}`} className="text-terracotta">{a?.phone}</a> · <a href={`mailto:${a?.email}`} className="text-terracotta">{a?.email}</a>
          </address>
          {customer && <p className="mt-2 text-xs text-espresso/60">Account: {customer.name} ({customer.email})</p>}

          <h2 className="mt-8 text-2xl">Payment</h2>
          <dl className="mt-3 space-y-1 text-sm">
            <div className="flex justify-between"><dt>Razorpay order</dt><dd className="font-mono text-xs">{payment?.razorpayOrderId ?? "-"}</dd></div>
            <div className="flex justify-between"><dt>Razorpay payment</dt><dd className="font-mono text-xs">{payment?.razorpayPaymentId ?? "-"}</dd></div>
            <div className="flex justify-between"><dt>Signature verified</dt><dd>{payment?.signatureVerified ? "Yes" : "No"}</dd></div>
            <div className="flex justify-between"><dt>Gateway status</dt><dd>{payment?.status ?? "-"}</dd></div>
          </dl>
        </section>
      </div>

      {paid && (
        <section className="mt-10">
          <h2 className="text-2xl">Notifications</h2>
          <ul className="mt-3 divide-y divide-sand border-y border-sand text-sm">
            {notes.length === 0 && <li className="py-3 text-espresso/60">None queued.</li>}
            {notes.map((n) => (
              <li key={String(n._id)} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <span className="uppercase tracking-wider">{n.channel}</span>
                <span className={n.status === "failed" ? "text-terracotta" : n.status === "sent" ? "text-olive" : ""}>
                  {n.status}{n.status !== "sent" && n.attempts ? ` · ${n.attempts} attempt${n.attempts > 1 ? "s" : ""}` : ""}
                </span>
                {n.lastError && <span className="w-full text-xs text-terracotta">{n.lastError}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-10 border border-sand bg-white/60 p-6">
        <h2 className="mb-5 text-2xl">Fulfilment</h2>
        <OrderActions
          orderId={String(order._id)}
          orderStatus={order.orderStatus}
          courierName={order.courierName ?? ""}
          courierTrackingNumber={order.courierTrackingNumber ?? ""}
          paid={paid}
        />
      </section>
    </div>
  );
}
