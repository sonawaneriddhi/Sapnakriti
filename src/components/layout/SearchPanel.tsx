"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Search, X } from "lucide-react";
import type { PublicProduct } from "@/lib/services/product.service";
import { formatPaise } from "@/lib/utils";

export default function SearchPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<PublicProduct[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setResults([]);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    const t = setTimeout(() => {
      fetch(`/api/products?q=${encodeURIComponent(term)}&limit=6`, { signal: controller.signal })
        .then((r) => r.json())
        .then((d) => setResults(d.products ?? []))
        .catch(() => undefined)
        .finally(() => setLoading(false));
    }, 200);
    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [q]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const term = q.trim();
    if (!term) return;
    onClose();
    router.push(`/search?q=${encodeURIComponent(term)}`);
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label="Search products">
          <motion.div className="absolute inset-0 bg-espresso/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div
            className="relative bg-ivory shadow-xl"
            initial={{ y: -40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -40, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="container-page max-w-3xl py-6">
              <form onSubmit={submit} className="flex items-center gap-3 border-b-2 border-olive pb-3" role="search">
                <Search size={20} className="text-olive" aria-hidden />
                <input
                  ref={inputRef}
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search candles, resin art, handcrafts…"
                  aria-label="Search products"
                  className="flex-1 bg-transparent font-serif text-2xl placeholder:text-espresso/30 focus:outline-none"
                />
                <button type="button" onClick={onClose} aria-label="Close search" className="p-1 text-olive hover:text-terracotta">
                  <X size={22} />
                </button>
              </form>

              <div className="min-h-[3rem] py-4" aria-live="polite">
                {q.trim().length >= 2 && !loading && results.length === 0 && (
                  <p className="text-sm text-espresso/60">No products found for “{q.trim()}”.</p>
                )}
                {results.length > 0 && (
                  <ul className="divide-y divide-sand">
                    {results.map((p) => (
                      <li key={p.id}>
                        <Link href={`/products/${p.slug}`} onClick={onClose} className="flex items-center gap-4 py-3 hover:bg-sand/30">
                          <div className="h-14 w-14 shrink-0 overflow-hidden bg-sand/40">
                            {p.images[0] && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={p.images[0].url} alt="" className="h-full w-full object-cover" />
                            )}
                          </div>
                          <span className="flex-1 font-serif text-lg">{p.name}</span>
                          <span className="text-sm text-olive">{p.available === 0 ? "Out of stock" : formatPaise(p.pricePaise)}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
                {q.trim().length >= 2 && results.length > 0 && (
                  <button onClick={submit} className="mt-3 text-sm uppercase tracking-[0.18em] text-terracotta hover:underline">
                    See all results
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
