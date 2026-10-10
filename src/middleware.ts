import { NextResponse, type NextRequest } from "next/server";

// First line of defence for the admin area (runs on the edge, so it uses Web Crypto).
// Every /api/admin route and admin page ALSO verifies the session itself on the server.
const COOKIE = "sapnakriti_admin";

async function validToken(token: string | undefined) {
  const secret = process.env.AUTH_SECRET;
  if (!token || !secret) return false;
  const [expStr, sig] = token.split(".");
  const exp = Number(expStr);
  if (!exp || !sig || exp < Math.floor(Date.now() / 1000)) return false;

  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`admin.${exp}`));
  const expected = Array.from(new Uint8Array(mac)).map((b) => b.toString(16).padStart(2, "0")).join("");
  if (expected.length !== sig.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  return diff === 0;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === "/admin/login") return NextResponse.next();

  if (await validToken(req.cookies.get(COOKIE)?.value)) return NextResponse.next();

  // The login endpoints must stay reachable; everything else under /admin is blocked.
  if (pathname === "/api/admin/login" || pathname === "/api/admin/logout") return NextResponse.next();
  if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Not authorised" }, { status: 401 });
  return NextResponse.redirect(new URL("/admin/login", req.url));
}

export const config = { matcher: ["/admin/:path*", "/api/admin/:path*"] };
