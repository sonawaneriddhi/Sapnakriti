import { NextResponse } from "next/server";
import { z } from "zod";
import { ADMIN_COOKIE, checkAdminCredentials, createAdminToken } from "@/lib/adminAuth";
import { clientIp, rateLimit } from "@/lib/rateLimit";

const schema = z.object({ username: z.string().min(1).max(100), password: z.string().min(1).max(200) });

export async function POST(req: Request) {
  // Slow down guessing: 6 attempts per 15 minutes per IP (per server instance).
  if (!rateLimit(`admin-login:${clientIp(req)}`, 6, 15 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many attempts. Try again in a few minutes." }, { status: 429 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter your username and password" }, { status: 400 });

  let ok = false;
  try {
    ok = await checkAdminCredentials(parsed.data.username, parsed.data.password);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Admin login is not configured on the server" }, { status: 500 });
  }
  if (!ok) {
    await new Promise((r) => setTimeout(r, 600));
    return NextResponse.json({ error: "Incorrect username or password" }, { status: 401 });
  }

  const token = createAdminToken();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, token.value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: token.maxAge,
  });
  return res;
}
