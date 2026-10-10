"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Re-fetches the order page a few times while we wait for the payment confirmation to land. */
export default function AutoRefresh({ intervalMs = 4000, max = 8 }: { intervalMs?: number; max?: number }) {
  const router = useRouter();
  useEffect(() => {
    let n = 0;
    const t = setInterval(() => {
      n++;
      router.refresh();
      if (n >= max) clearInterval(t);
    }, intervalMs);
    return () => clearInterval(t);
  }, [router, intervalMs, max]);
  return null;
}
