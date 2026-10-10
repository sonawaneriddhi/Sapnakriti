# SAPNAKRITI

Next.js (App Router) store for candles, resin work and handcrafts, with Razorpay payments, emailed invoices, WhatsApp order messages and a separate admin panel.

## Run locally

```bash
npm install
# edit .env.local and fill MONGODB_URI (MongoDB Atlas) at minimum
npm run seed      # optional sample products
npm run dev       # http://localhost:3000
```

## Admin panel

Open **/admin** (type the address; the storefront never links to it). You get a login page.
It is completely separate from customer accounts: customers cannot reach it, and it cannot be used to shop.

- Username: `Rajat`
- Password: `Rajat@0906`

The login lives in `.env.local` as `ADMIN_USERNAME` and `ADMIN_PASSWORD_HASH_B64` (a bcrypt hash, never the plain password).
To change the password:

```bash
npm run admin-hash -- "NewPassword"   # paste the printed line into .env.local
```

On Vercel, add the same two variables (plus `AUTH_SECRET`) under Project Settings → Environment Variables.
Admin sessions last 8 hours, are HTTP-only and are re-checked on every admin page and every admin API call.

## Before going live

- Fill the other variables in `.env.example` (Razorpay, Cloudinary, Resend, WhatsApp).
- Add the Razorpay webhook: `https://YOUR-DOMAIN/api/webhooks/razorpay` with events `payment.captured`, `payment.failed`, `order.paid`.
- Create and get approval for the WhatsApp order-confirmation template (see `src/lib/integrations/whatsapp.ts`).
- Set `CRON_SECRET`; `vercel.json` runs the daily maintenance job (releases stale stock holds, retries failed notifications).
- Use a MongoDB Atlas cluster (replica set) and test payments with Razorpay TEST keys first.
