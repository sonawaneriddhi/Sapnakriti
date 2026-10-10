"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { LogIn, Menu, Search, ShoppingBag, User, X } from "lucide-react";
import { CATEGORIES } from "@/lib/config";
import { useCart } from "@/components/cart/CartProvider";
import SearchPanel from "@/components/layout/SearchPanel";
import CartDrawer from "@/components/cart/CartDrawer";

export default function Navbar({ user }: { user: { name?: string | null } | null }) {
  const { count, open: openCart } = useCart();
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-sand/70 bg-ivory/95 backdrop-blur">
        <div className="container-page grid h-16 grid-cols-[auto_1fr_auto] items-center gap-4 sm:h-20 lg:grid-cols-[1fr_auto_1fr]">
          {/* Left: menu button (mobile) + brand */}
          <div className="flex items-center gap-3">
            <button className="p-1 text-olive lg:hidden" onClick={() => setMenuOpen(true)} aria-label="Open menu">
              <Menu size={24} />
            </button>
            <Link href="/" className="font-serif text-xl font-semibold tracking-brand text-olive sm:text-2xl" aria-label="SAPNAKRITI home">
              SAPNAKRITI
            </Link>
          </div>

          {/* Middle: categories */}
          <nav className="hidden items-center gap-10 lg:flex" aria-label="Shop by category">
            {CATEGORIES.map((c) => (
              <Link key={c.slug} href={`/category/${c.slug}`} className="text-sm uppercase tracking-[0.2em] text-espresso transition hover:text-terracotta">
                {c.label}
              </Link>
            ))}
          </nav>
          <div className="lg:hidden" />

          {/* Right: search, login, cart */}
          <div className="flex items-center justify-end gap-1 sm:gap-3">
            <button onClick={() => setSearchOpen(true)} aria-label="Search" className="p-2 text-olive hover:text-terracotta">
              <Search size={21} />
            </button>

            {user ? (
              <div className="relative">
                <button
                  onClick={() => setAccountOpen((v) => !v)}
                  aria-label="Account menu"
                  aria-expanded={accountOpen}
                  className="p-2 text-olive hover:text-terracotta"
                >
                  <User size={21} />
                </button>
                {accountOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setAccountOpen(false)} />
                    <div className="absolute right-0 z-20 mt-2 w-48 border border-sand bg-ivory py-2 shadow-lg">
                      <p className="truncate px-4 py-2 text-xs uppercase tracking-[0.16em] text-olive">{user.name ?? "My account"}</p>
                      <Link href="/account" onClick={() => setAccountOpen(false)} className="block px-4 py-2 text-sm hover:bg-sand/40">
                        My orders
                      </Link>
                      <button onClick={() => signOut({ callbackUrl: "/" })} className="block w-full px-4 py-2 text-left text-sm hover:bg-sand/40">
                        Sign out
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <Link href="/login" className="flex items-center gap-2 p-2 text-sm uppercase tracking-[0.18em] text-olive hover:text-terracotta">
                <LogIn size={19} className="sm:hidden" aria-hidden />
                <span className="hidden sm:inline">Login</span>
                <span className="sr-only sm:hidden">Login</span>
              </Link>
            )}

            <button onClick={openCart} aria-label={`Open cart, ${count} items`} className="relative p-2 text-olive hover:text-terracotta">
              <ShoppingBag size={21} />
              {count > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-terracotta px-1 text-[11px] font-medium text-ivory">
                  {count}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-[70] bg-ivory lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="container-page flex h-16 items-center justify-between">
            <span className="font-serif text-xl font-semibold tracking-brand text-olive">SAPNAKRITI</span>
            <button onClick={() => setMenuOpen(false)} aria-label="Close menu" className="p-1 text-olive">
              <X size={24} />
            </button>
          </div>
          <nav className="container-page mt-10 flex flex-col gap-6" aria-label="Shop by category">
            {CATEGORIES.map((c) => (
              <Link key={c.slug} href={`/category/${c.slug}`} onClick={() => setMenuOpen(false)} className="font-serif text-4xl text-espresso hover:text-terracotta">
                {c.label}
              </Link>
            ))}
            <hr className="border-sand" />
            {user ? (
              <>
                <Link href="/account" onClick={() => setMenuOpen(false)} className="text-sm uppercase tracking-[0.2em]">
                  My orders
                </Link>
                <button onClick={() => signOut({ callbackUrl: "/" })} className="text-left text-sm uppercase tracking-[0.2em]">
                  Sign out
                </button>
              </>
            ) : (
              <Link href="/login" onClick={() => setMenuOpen(false)} className="text-sm uppercase tracking-[0.2em]">
                Login / Register
              </Link>
            )}
          </nav>
        </div>
      )}

      <SearchPanel open={searchOpen} onClose={() => setSearchOpen(false)} />
      <CartDrawer />
    </>
  );
}
