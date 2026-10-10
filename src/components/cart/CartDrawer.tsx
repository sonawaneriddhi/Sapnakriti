"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { useCart } from "@/components/cart/CartProvider";
import { useCartLines } from "@/components/cart/useCartLines";
import { formatPaise } from "@/lib/utils";
import { FREE_SHIPPING_THRESHOLD_PAISE } from "@/lib/config";

export default function CartDrawer() {
  const { isOpen, close, items, setQuantity, remove } = useCart();
  const { data, loading, error } = useCartLines(isOpen);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [isOpen, close]);

  // Drop items that no longer exist so the cart badge stays honest.
  useEffect(() => {
    data?.missing.forEach((id) => remove(id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.missing.join(",")]);

  const hasUnavailable = data?.lines.some((l) => l.quantity === 0) ?? false;
  const canCheckout = !!data && data.lines.length > 0 && !hasUnavailable && !loading;
  const toFree = data ? Math.max(0, FREE_SHIPPING_THRESHOLD_PAISE - data.subtotalPaise) : 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label="Shopping cart">
          <motion.div
            className="absolute inset-0 bg-espresso/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
          />
          <motion.aside
            className="absolute right-0 top-0 flex h-full w-full flex-col bg-ivory shadow-2xl sm:max-w-md"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.28 }}
          >
            <header className="flex items-center justify-between border-b border-sand px-6 py-5">
              <h2 className="text-2xl">Your cart</h2>
              <button onClick={close} aria-label="Close cart" className="p-1 text-olive hover:text-terracotta">
                <X size={22} />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              {items.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
                  <ShoppingBag size={36} className="text-sage" />
                  <p className="font-serif text-xl">Your cart is empty</p>
                  <p className="text-sm text-espresso/60">Small-batch things are waiting for you.</p>
                  <Link href="/category/candles" onClick={close} className="btn-outline mt-2">
                    Explore candles
                  </Link>
                </div>
              ) : (
                <>
                  {error && <p className="mb-3 text-sm text-terracotta">{error}</p>}
                  {!data && loading && <p className="text-sm text-espresso/60">Loading your cart…</p>}
                  <ul className="divide-y divide-sand">
                    {data?.lines.map(({ product, quantity, requested }) => {
                      const cartQty = items.find((i) => i.productId === product.id)?.quantity ?? requested;
                      const soldOut = product.available === 0;
                      return (
                        <li key={product.id} className="flex gap-4 py-5">
                          <Link href={`/products/${product.slug}`} onClick={close} className="h-24 w-24 shrink-0 overflow-hidden bg-sand/40">
                            {product.images[0] ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={product.images[0].url} alt={product.images[0].alt ?? product.name} className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center font-serif text-sage">S</div>
                            )}
                          </Link>
                          <div className="flex flex-1 flex-col">
                            <div className="flex justify-between gap-2">
                              <Link href={`/products/${product.slug}`} onClick={close} className="font-serif text-lg leading-tight hover:text-terracotta">
                                {product.name}
                              </Link>
                              <button onClick={() => remove(product.id)} aria-label={`Remove ${product.name}`} className="text-espresso/40 hover:text-terracotta">
                                <Trash2 size={16} />
                              </button>
                            </div>
                            <p className="mt-1 text-sm text-espresso/70">{formatPaise(product.pricePaise)}</p>
                            {soldOut ? (
                              <p className="mt-2 text-sm font-medium text-terracotta">Out of stock, please remove</p>
                            ) : (
                              <>
                                <div className="mt-auto flex items-center justify-between pt-2">
                                  <div className="flex items-center border border-sand">
                                    <button
                                      aria-label="Decrease quantity"
                                      className="p-2 hover:bg-sand/40"
                                      onClick={() => setQuantity(product.id, cartQty - 1)}
                                    >
                                      <Minus size={14} />
                                    </button>
                                    <span className="w-8 text-center text-sm" aria-live="polite">
                                      {quantity}
                                    </span>
                                    <button
                                      aria-label="Increase quantity"
                                      className="p-2 hover:bg-sand/40 disabled:opacity-30"
                                      disabled={quantity >= product.available}
                                      onClick={() => setQuantity(product.id, Math.min(cartQty + 1, product.available))}
                                    >
                                      <Plus size={14} />
                                    </button>
                                  </div>
                                  <span className="font-medium">{formatPaise(product.pricePaise * quantity)}</span>
                                </div>
                                {requested > product.available && (
                                  <p className="mt-1 text-xs text-terracotta">Only {product.available} available</p>
                                )}
                              </>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}
            </div>

            {items.length > 0 && data && (
              <footer className="border-t border-sand bg-white/50 px-6 py-5">
                <dl className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <dt>Subtotal</dt>
                    <dd>{formatPaise(data.subtotalPaise)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Shipping</dt>
                    <dd>{data.shippingPaise === 0 ? "Free" : formatPaise(data.shippingPaise)}</dd>
                  </div>
                  <div className="flex justify-between pt-2 font-serif text-xl">
                    <dt>Total</dt>
                    <dd>{formatPaise(data.totalPaise)}</dd>
                  </div>
                </dl>
                {toFree > 0 && data.subtotalPaise > 0 && (
                  <p className="mt-2 text-xs text-olive">Add {formatPaise(toFree)} more for free shipping.</p>
                )}
                {canCheckout ? (
                  <Link href="/checkout" onClick={close} className="btn-primary mt-4 w-full">
                    Checkout
                  </Link>
                ) : (
                  <button disabled className="btn-primary mt-4 w-full">
                    Checkout
                  </button>
                )}
              </footer>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
