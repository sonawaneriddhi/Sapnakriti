"use client";

import { useState } from "react";
import { ShoppingBag } from "lucide-react";
import { useCart } from "@/components/cart/CartProvider";

export default function AddToCartButton({
  productId,
  available,
  quantity = 1,
  className = "btn-primary w-full",
  compact = false,
}: {
  productId: string;
  available: number;
  quantity?: number;
  className?: string;
  compact?: boolean;
}) {
  const { add, items } = useCart();
  const [justAdded, setJustAdded] = useState(false);
  const inCart = items.find((i) => i.productId === productId)?.quantity ?? 0;
  const soldOut = available <= 0;
  const maxedOut = !soldOut && inCart >= available;

  if (soldOut) {
    return (
      <button disabled className={className} aria-disabled="true">
        Out of Stock
      </button>
    );
  }

  return (
    <button
      className={className}
      disabled={maxedOut}
      onClick={() => {
        add(productId, quantity, available);
        setJustAdded(true);
        setTimeout(() => setJustAdded(false), 1500);
      }}
    >
      <ShoppingBag size={compact ? 15 : 17} aria-hidden />
      {maxedOut ? "All in cart" : justAdded ? "Added" : "Add to Cart"}
    </button>
  );
}
