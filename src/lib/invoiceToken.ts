import crypto from "crypto";

// Signed, expiring link so the WhatsApp/email recipient can fetch their invoice PDF without a login session.
function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not set");
  return s;
}

export function signInvoiceToken(orderId: string, days = 30) {
  const exp = Math.floor(Date.now() / 1000) + days * 86400;
  const sig = crypto.createHmac("sha256", secret()).update(`${orderId}.${exp}`).digest("hex");
  return `${exp}.${sig}`;
}

export function verifyInvoiceToken(orderId: string, token: string | null) {
  if (!token) return false;
  const [expStr, sig] = token.split(".");
  const exp = Number(expStr);
  if (!exp || !sig || exp < Math.floor(Date.now() / 1000)) return false;
  const expected = crypto.createHmac("sha256", secret()).update(`${orderId}.${exp}`).digest("hex");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || process.env.AUTH_URL || "http://localhost:3000").replace(/\/$/, "");
}

export function signedInvoiceLink(orderId: string) {
  return `${siteUrl()}/api/invoices/${orderId}?token=${signInvoiceToken(orderId)}`;
}
