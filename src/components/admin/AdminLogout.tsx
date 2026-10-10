"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export default function AdminLogout() {
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        await fetch("/api/admin/logout", { method: "POST" });
        router.push("/admin/login");
        router.refresh();
      }}
      className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-olive hover:text-terracotta"
    >
      <LogOut size={16} aria-hidden /> Sign out
    </button>
  );
}
