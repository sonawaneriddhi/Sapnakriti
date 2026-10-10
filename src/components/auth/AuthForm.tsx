"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { signIn } from "next-auth/react";

export default function AuthForm({ mode, callbackUrl }: { mode: "login" | "register"; callbackUrl: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function login(email: string, password: string) {
    const res = await signIn("credentials", { email, password, redirect: false });
    if (!res || res.error) throw new Error("Incorrect email or password");
    router.push(callbackUrl);
    router.refresh();
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "register") {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error ?? "Could not create your account");
      }
      await login(form.email, form.password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  const q = callbackUrl !== "/" ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : "";

  return (
    <div className="mx-auto w-full max-w-md px-5 py-16 sm:py-24">
      <div className="text-center">
        <p className="eyebrow">{mode === "login" ? "Welcome back" : "Join SAPNAKRITI"}</p>
        <h1 className="mt-3 text-5xl">{mode === "login" ? "Login" : "Create account"}</h1>
        {callbackUrl.startsWith("/checkout") && (
          <p className="mt-3 text-sm text-espresso/70">Sign in to continue to checkout. Your cart is saved.</p>
        )}
      </div>

      <form onSubmit={onSubmit} className="mt-10 space-y-5" noValidate>
        {mode === "register" && (
          <>
            <div>
              <label htmlFor="name" className="field-label">Full name</label>
              <input id="name" required autoComplete="name" value={form.name} onChange={set("name")} className="field" />
            </div>
            <div>
              <label htmlFor="phone" className="field-label">Mobile number</label>
              <input id="phone" required inputMode="tel" autoComplete="tel" placeholder="10-digit mobile number" value={form.phone} onChange={set("phone")} className="field" />
            </div>
          </>
        )}
        <div>
          <label htmlFor="email" className="field-label">Email</label>
          <input id="email" type="email" required autoComplete="email" value={form.email} onChange={set("email")} className="field" />
        </div>
        <div>
          <label htmlFor="password" className="field-label">Password</label>
          <input
            id="password"
            type="password"
            required
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            value={form.password}
            onChange={set("password")}
            className="field"
          />
          {mode === "register" && <p className="mt-1.5 text-xs text-espresso/60">At least 8 characters, with a letter and a number.</p>}
        </div>

        {error && (
          <p role="alert" className="text-sm text-terracotta">
            {error}
          </p>
        )}

        <button disabled={loading} className="btn-primary w-full">
          {loading ? "Please wait…" : mode === "login" ? "Login" : "Create account"}
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-espresso/70">
        {mode === "login" ? (
          <>
            New here?{" "}
            <Link href={`/register${q}`} className="text-terracotta underline">
              Create an account
            </Link>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <Link href={`/login${q}`} className="text-terracotta underline">
              Login
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
