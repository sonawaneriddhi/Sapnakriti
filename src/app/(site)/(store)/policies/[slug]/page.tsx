import { notFound } from "next/navigation";

const policies: Record<string, { title: string; body: string[] }> = {
  shipping: {
    title: "Shipping policy",
    body: [
      "Orders are packed within 2-3 working days of payment confirmation and shipped with a tracked courier across India.",
      "Shipping is free on orders above ₹999. A flat fee of ₹80 applies to smaller orders.",
      "You will receive your packing code and invoice by email and WhatsApp as soon as your payment is confirmed.",
    ],
  },
  returns: {
    title: "Returns & refunds",
    body: [
      "Because every piece is handmade, please contact us within 48 hours of delivery if an item arrives damaged. Share a photo and your order number.",
      "Approved refunds are returned to your original payment method via Razorpay.",
      "Candles and personalised items cannot be returned unless damaged in transit.",
    ],
  },
  privacy: {
    title: "Privacy policy",
    body: [
      "We collect only what is needed to process your order: your name, contact details and delivery address.",
      "Payments are processed by Razorpay. We never see or store your card or UPI details.",
      "We do not sell your personal information.",
    ],
  },
  terms: {
    title: "Terms of service",
    body: [
      "By placing an order you agree to provide accurate delivery information.",
      "Prices and availability can change without notice. Your order is confirmed only after successful payment.",
    ],
  },
};

export default async function PolicyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const policy = policies[slug];
  if (!policy) notFound();
  return (
    <div className="container-page max-w-3xl py-16">
      <h1 className="text-5xl">{policy.title}</h1>
      <div className="mt-8 space-y-5 text-lg leading-relaxed text-espresso/80">
        {policy.body.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </div>
      <p className="mt-10 text-sm text-espresso/50">
        This is starter text. Please review and replace it with your own policy before launch.
      </p>
    </div>
  );
}
