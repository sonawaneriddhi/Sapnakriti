"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Lock } from "lucide-react";
import { useCart } from "@/components/cart/CartProvider";
import { useCartLines } from "@/components/cart/useCartLines";
import { formatPaise } from "@/lib/utils";

export interface Profile {
  fullName: string;
  email: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
}

const STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala",
  "Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura",
  "Uttar Pradesh","Uttarakhand","West Bengal","Andaman and Nicobar Islands","Chandigarh","Dadra and Nagar Haveli and Daman and Diu","Delhi",
  "Jammu and Kashmir","Ladakh","Lakshadweep","Puducherry",
];

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void; on: (event: string, cb: (r: { error?: { description?: string } }) => void) => void };
  }
}

function loadRazorpay() {
  return new Promise<boolean>((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export default function CheckoutClient({ profile }: { profile: Profile }) {
  const router = useRouter();
  const { clear } = useCart();
  const { data, loading, error: cartError } = useCartLines();
  const [form, setForm] = useState<Profile>(profile);
  const [errors, setErrors] = useState<Partial<Record<keyof Profile, string>>>({});
  const [formError, setFormError] = useState("");
  const [paying, setPaying] = useState(false);

  const set = (k: keyof Profile) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const payable = data?.lines.filter((l) => l.quantity > 0) ?? [];
  const hasUnavailable = data?.lines.some((l) => l.quantity === 0 || l.quantity < l.requested) ?? false;

  function validate() {
    const e: Partial<Record<keyof Profile, string>> = {};
    if (form.fullName.trim().length < 2) e.fullName = "Enter the recipient's name";
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) e.email = "Enter a valid email";
    const digits = form.phone.replace(/\D/g, "");
    const ten = digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits;
    if (!/^[6-9]\d{9}$/.test(ten)) e.phone = "Enter a valid 10-digit mobile number";
    if (form.line1.trim().length < 3) e.line1 = "Enter your address";
    if (form.city.trim().length < 2) e.city = "Enter your city";
    if (!form.state) e.state = "Select your state";
    if (!/^[1-9]\d{5}$/.test(form.postalCode.trim())) e.postalCode = "Enter a valid 6-digit PIN code";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function pay() {
    setFormError("");
    if (!validate() || payable.length === 0) return;
    setPaying(true);

    try {
      const ok = await loadRazorpay();
      if (!ok) throw new Error("Could not load the payment window. Check your connection and try again.");

      const res = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: payable.map((l) => ({ productId: l.product.id, quantity: l.quantity })),
          address: { ...form, country: "India" },
          saveAddress: true,
        }),
      });
      if (res.status === 401) {
        router.push("/login?callbackUrl=/checkout");
        return;
      }
      const order = await res.json();
      if (!res.ok) throw new Error(order.error ?? "Could not start payment");

      const rzp = new window.Razorpay!({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: "SAPNAKRITI",
        description: `Order ${order.orderNumber}`,
        order_id: order.razorpayOrderId,
        prefill: { name: form.fullName, email: form.email, contact: form.phone },
        notes: { orderNumber: order.orderNumber },
        theme: { color: "#555B43" },
        modal: {
          ondismiss: () => {
            // Window closed without paying: free the reserved stock.
            fetch("/api/payments/abandon", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ orderId: order.orderId }),
            }).catch(() => undefined);
            setPaying(false);
          },
        },
        handler: async (resp: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          try {
            const v = await fetch("/api/payments/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(resp),
            });
            if (v.ok || v.status === 202) {
              clear();
              router.push(`/orders/${order.orderId}?${v.ok ? "paid=1" : "pending=1"}`);
              return;
            }
            const d = await v.json().catch(() => ({}));
            setFormError(d.error ?? "We could not confirm your payment. If money was deducted, it will be refunded or confirmed shortly.");
          } catch {
            // Network hiccup after paying: the webhook will still confirm the order.
            clear();
            router.push(`/orders/${order.orderId}?pending=1`);
          }
          setPaying(false);
        },
      });
      rzp.on("payment.failed", (r) => setFormError(r.error?.description ?? "Payment failed. You can try again."));
      rzp.open();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Something went wrong");
      setPaying(false);
    }
  }

  const field = (id: keyof Profile, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label htmlFor={id} className="field-label">{label}</label>
      <input id={id} value={form[id]} onChange={set(id)} aria-invalid={!!errors[id]} className="field" {...props} />
      {errors[id] && <p className="mt-1 text-xs text-terracotta">{errors[id]}</p>}
    </div>
  );

  if (data && data.lines.length === 0) {
    return (
      <div className="container-page py-24 text-center">
        <h1 className="text-4xl">Your cart is empty</h1>
        <Link href="/" className="btn-outline mt-8">Continue shopping</Link>
      </div>
    );
  }

  return (
    <div className="container-page py-12">
      <h1 className="text-center text-5xl">Checkout</h1>
      <div className="mt-12 grid gap-12 lg:grid-cols-[1fr_420px]">
        <section aria-labelledby="delivery-title">
          <h2 id="delivery-title" className="text-3xl">Delivery details</h2>
          <p className="mt-1 text-sm text-espresso/60">Pre-filled from your account. You can edit anything for this order.</p>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">{field("fullName", "Full name", { autoComplete: "name" })}</div>
            {field("email", "Email", { type: "email", autoComplete: "email" })}
            {field("phone", "Mobile number", { inputMode: "tel", autoComplete: "tel" })}
            <div className="sm:col-span-2">{field("line1", "Address line 1", { autoComplete: "address-line1" })}</div>
            <div className="sm:col-span-2">{field("line2", "Address line 2 (optional)", { autoComplete: "address-line2" })}</div>
            {field("city", "City", { autoComplete: "address-level2" })}
            <div>
              <label htmlFor="state" className="field-label">State</label>
              <select id="state" value={form.state} onChange={set("state")} aria-invalid={!!errors.state} className="field" autoComplete="address-level1">
                <option value="">Select state</option>
                {STATES.map((s) => <option key={s}>{s}</option>)}
              </select>
              {errors.state && <p className="mt-1 text-xs text-terracotta">{errors.state}</p>}
            </div>
            {field("postalCode", "PIN code", { inputMode: "numeric", maxLength: 6, autoComplete: "postal-code" })}
            <div>
              <label className="field-label">Country</label>
              <input value="India" disabled className="field opacity-70" />
            </div>
          </div>
        </section>

        <aside aria-labelledby="summary-title" className="h-fit border border-sand bg-white/50 p-6">
          <h2 id="summary-title" className="text-3xl">Order summary</h2>
          {cartError && <p className="mt-3 text-sm text-terracotta">{cartError}</p>}
          {!data && loading && <p className="mt-4 text-sm text-espresso/60">Loading…</p>}
          <ul className="mt-5 divide-y divide-sand">
            {data?.lines.map(({ product, quantity, requested }) => (
              <li key={product.id} className="flex gap-3 py-3">
                <div className="h-16 w-16 shrink-0 overflow-hidden bg-sand/40">
                  {product.images[0] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={product.images[0].url} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="flex-1 text-sm">
                  <p className="font-serif text-lg leading-tight">{product.name}</p>
                  {quantity === 0 ? (
                    <p className="text-terracotta">Out of stock</p>
                  ) : (
                    <p className="text-espresso/60">Qty {quantity}{requested > quantity && ` (only ${quantity} available)`}</p>
                  )}
                </div>
                <p className="text-sm">{formatPaise(product.pricePaise * quantity)}</p>
              </li>
            ))}
          </ul>

          {data && (
            <dl className="mt-4 space-y-1.5 border-t border-sand pt-4 text-sm">
              <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatPaise(data.subtotalPaise)}</dd></div>
              <div className="flex justify-between"><dt>Shipping</dt><dd>{data.shippingPaise === 0 ? "Free" : formatPaise(data.shippingPaise)}</dd></div>
              <div className="flex justify-between pt-2 font-serif text-2xl"><dt>Total</dt><dd>{formatPaise(data.totalPaise)}</dd></div>
            </dl>
          )}

          {hasUnavailable && <p className="mt-4 text-sm text-terracotta">Some items changed in availability. We've adjusted your order to what's in stock.</p>}
          {formError && <p role="alert" className="mt-4 text-sm text-terracotta">{formError}</p>}

          <button onClick={pay} disabled={paying || !data || payable.length === 0} className="btn-accent mt-6 w-full">
            <Lock size={16} aria-hidden />
            {paying ? "Opening payment…" : "Pay with Razorpay"}
          </button>
          <p className="mt-3 text-center text-xs text-espresso/50">Secure payment by Razorpay. UPI, cards, netbanking &amp; wallets.</p>
        </aside>
      </div>
    </div>
  );
}
