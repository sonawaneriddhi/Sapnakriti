"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AdminLoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (res.ok) {
      router.push("/admin");
      router.refresh();
      return;
    }
    const data = await res.json().catch(() => ({}));
    setError(data.error ?? "Could not sign in");
    setLoading(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <div className="text-center">
          <p className="font-serif text-2xl font-semibold tracking-brand text-olive">SAPNAKRITI</p>
          <p className="mt-2 text-xs uppercase tracking-[0.3em] text-terracotta">Admin access</p>
        </div>
        <form onSubmit={onSubmit} className="mt-10 space-y-5">
          <div>
            <label htmlFor="username" className="field-label">Username</label>
            <input id="username" required autoComplete="username" autoFocus value={username} onChange={(e) => setUsername(e.target.value)} className="field" />
          </div>
          <div>
            <label htmlFor="password" className="field-label">Password</label>
            <input id="password" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="field" />
          </div>
          {error && <p role="alert" className="text-sm text-terracotta">{error}</p>}
          <button disabled={loading} className="btn-primary w-full">{loading ? "Signing in…" : "Sign in"}</button>
        </form>
      </div>
    </div>
  );
}
