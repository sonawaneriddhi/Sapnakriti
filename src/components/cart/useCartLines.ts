"use client";

import { useEffect, useState } from "react";
import { useCart } from "@/components/cart/CartProvider";
import type { PublicProduct } from "@/lib/services/product.service";

export interface CartLine {
  product: PublicProduct;
  requested: number;
  quantity: number;
}

export interface PricedCart {
  lines: CartLine[];
  missing: string[];
  subtotalPaise: number;
  shippingPaise: number;
  totalPaise: number;
}

/** Fetches live prices/stock for the ids in the browser cart. */
export function useCartLines(enabled = true) {
  const { items, ready } = useCart();
  const [data, setData] = useState<PricedCart | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const key = JSON.stringify(items);

  useEffect(() => {
    if (!enabled || !ready) return;
    if (items.length === 0) {
      setData({ lines: [], missing: [], subtotalPaise: 0, shippingPaise: 0, totalPaise: 0 });
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError("");
    fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
      signal: controller.signal,
    })
      .then(async (r) => {
        if (!r.ok) throw new Error("Could not load your cart");
        setData(await r.json());
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message || "Could not load your cart");
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled, ready]);

  return { data, loading, error };
}
