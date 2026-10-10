import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/session";
import AdminNav from "@/components/admin/AdminNav";
import AdminLogout from "@/components/admin/AdminLogout";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: { default: "Admin", template: "%s · Admin" }, robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Verified on the server for every request, in addition to the middleware.
  await requireAdminPage();
  return (
    <div className="min-h-screen">
      <header className="border-b border-sand bg-ivory">
        <div className="container-page flex h-16 items-center justify-between">
          <span className="font-serif text-xl font-semibold tracking-brand text-olive">
            SAPNAKRITI <span className="ml-2 text-xs font-normal uppercase tracking-[0.3em] text-terracotta">Admin</span>
          </span>
          <AdminLogout />
        </div>
      </header>
      <div className="container-page grid gap-8 py-10 lg:grid-cols-[220px_1fr]">
        <aside className="lg:sticky lg:top-8 lg:self-start">
          <AdminNav />
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
