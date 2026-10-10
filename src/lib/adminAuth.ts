import crypto from "crypto";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

// Admin access is completely separate from customer accounts. There is one admin login whose
// username and bcrypt password hash live in environment variables (never in source code):
//   ADMIN_USERNAME, ADMIN_PASSWORD_HASH_B64   (generate with: npm run admin-hash -- "password")
export const ADMIN_COOKIE = "sapnakriti_admin";
const SESSION_HOURS = 8;

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not set");
  return s;
}

function sign(exp: number) {
  return crypto.createHmac("sha256", secret()).update(`admin.${exp}`).digest("hex");
}

export function createAdminToken() {
  const exp = Math.floor(Date.now() / 1000) + SESSION_HOURS * 3600;
  return { value: `${exp}.${sign(exp)}`, maxAge: SESSION_HOURS * 3600 };
}

export function verifyAdminToken(token: string | undefined | null) {
  if (!token) return false;
  const [expStr, sig] = token.split(".");
  const exp = Number(expStr);
  if (!exp || !sig || exp < Math.floor(Date.now() / 1000)) return false;
  const a = Buffer.from(sig);
  const b = Buffer.from(sign(exp));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** True when the current request carries a valid admin session cookie. */
export async function isAdminRequest() {
  const jar = await cookies();
  return verifyAdminToken(jar.get(ADMIN_COOKIE)?.value);
}

function sha(s: string) {
  return crypto.createHash("sha256").update(s).digest();
}

export async function checkAdminCredentials(username: string, password: string) {
  const expectedUser = process.env.ADMIN_USERNAME;
  const hashB64 = process.env.ADMIN_PASSWORD_HASH_B64;
  if (!expectedUser || !hashB64) throw new Error("Admin login is not configured (ADMIN_USERNAME / ADMIN_PASSWORD_HASH_B64)");
  const hash = Buffer.from(hashB64, "base64").toString("utf8");

  // Always run both checks so timing does not reveal which part was wrong.
  const userOk = crypto.timingSafeEqual(sha(username), sha(expectedUser));
  const passOk = await bcrypt.compare(password, hash);
  return userOk && passOk;
}
