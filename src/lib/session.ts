import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdminRequest } from "@/lib/adminAuth";

/** Customer session (storefront accounts only). */
export async function getSessionUser() {
  const session = await auth();
  return session?.user?.id ? session.user : null;
}

/** For pages: send signed-out visitors to login and bring them back afterwards. */
export async function requireUserPage(callbackUrl: string) {
  const user = await getSessionUser();
  if (!user) redirect(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  return user;
}

/** Admin pages: requires the separate admin login (not a customer account). */
export async function requireAdminPage() {
  if (!(await isAdminRequest())) redirect("/admin/login");
}

/** Admin API routes: every endpoint calls this itself, independent of the middleware. */
export async function requireAdminApi(): Promise<
  { ok: true; user: { id: string } } | { ok: false; res: NextResponse }
> {
  if (!(await isAdminRequest())) {
    return { ok: false, res: NextResponse.json({ error: "Not authorised" }, { status: 401 }) };
  }
  return { ok: true, user: { id: "admin" } };
}

/** Only allow same-site relative redirects after login. */
export function safeCallbackUrl(url: string | undefined | null, fallback = "/") {
  if (!url) return fallback;
  return url.startsWith("/") && !url.startsWith("//") ? url : fallback;
}
