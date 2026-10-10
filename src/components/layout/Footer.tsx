import Link from "next/link";
import { CATEGORIES } from "@/lib/config";

export default function Footer() {
  const email = process.env.BUSINESS_EMAIL;
  const phone = process.env.BUSINESS_PHONE;
  return (
    <footer className="mt-24 bg-espresso text-ivory">
      <div className="container-page grid gap-12 py-16 md:grid-cols-4">
        <div className="md:col-span-1">
          <p className="font-serif text-2xl font-semibold tracking-brand">SAPNAKRITI</p>
          <p className="mt-2 text-[11px] uppercase tracking-[0.3em] text-sage">Handmade with intention</p>
          <p className="mt-5 text-sm leading-relaxed text-ivory/70">Small-batch candles, resin art and handcrafted treasures, made slowly and with care.</p>
        </div>

        <div>
          <h3 className="font-sans text-xs font-medium uppercase tracking-[0.25em] text-sand">Shop</h3>
          <ul className="mt-4 space-y-2.5 text-sm text-ivory/80">
            {CATEGORIES.map((c) => (
              <li key={c.slug}>
                <Link href={`/category/${c.slug}`} className="hover:text-terracotta">
                  {c.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="font-sans text-xs font-medium uppercase tracking-[0.25em] text-sand">Help</h3>
          <ul className="mt-4 space-y-2.5 text-sm text-ivory/80">
            <li><Link href="/policies/shipping" className="hover:text-terracotta">Shipping policy</Link></li>
            <li><Link href="/policies/returns" className="hover:text-terracotta">Returns &amp; refunds</Link></li>
            <li><Link href="/policies/privacy" className="hover:text-terracotta">Privacy policy</Link></li>
            <li><Link href="/policies/terms" className="hover:text-terracotta">Terms of service</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="font-sans text-xs font-medium uppercase tracking-[0.25em] text-sand">Contact</h3>
          <ul className="mt-4 space-y-2.5 text-sm text-ivory/80">
            {email && <li><a href={`mailto:${email}`} className="hover:text-terracotta">{email}</a></li>}
            {phone && <li><a href={`tel:${phone}`} className="hover:text-terracotta">{phone}</a></li>}
            {!email && !phone && <li>Add BUSINESS_EMAIL / BUSINESS_PHONE to show contact details.</li>}
          </ul>
          <div className="mt-5 flex gap-5 text-sm text-ivory/80">
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="hover:text-terracotta">Instagram</a>
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="hover:text-terracotta">Facebook</a>
          </div>
        </div>
      </div>
      <div className="border-t border-ivory/10 py-6 text-center text-xs tracking-[0.15em] text-ivory/50">
        © {new Date().getFullYear()} SAPNAKRITI. All rights reserved.
      </div>
    </footer>
  );
}
