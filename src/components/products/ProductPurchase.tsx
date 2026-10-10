"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import AddToCartButton from "@/components/products/AddToCartButton";

export default function ProductPurchase({ productId, available }: { productId: string; available: number }) {
  const [qty, setQty] = useState(1);
  const max = Math.min(available, 10);

  if (available <= 0) {
    return <AddToCartButton productId={productId} available={0} />;
  }
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-stretch">
      <div className="flex w-fit items-center border border-sand">
        <button aria-label="Decrease quantity" className="p-3 hover:bg-sand/40" onClick={() => setQty((q) => Math.max(1, q - 1))}>
          <Minus size={16} />
        </button>
        <span className="w-10 text-center" aria-live="polite">
          {qty}
        </span>
        <button aria-label="Increase quantity" className="p-3 hover:bg-sand/40 disabled:opacity-30" disabled={qty >= max} onClick={() => setQty((q) => Math.min(max, q + 1))}>
          <Plus size={16} />
        </button>
      </div>
      <div className="flex-1">
        <AddToCartButton productId={productId} available={available} quantity={qty} />
      </div>
    </div>
  );
}
