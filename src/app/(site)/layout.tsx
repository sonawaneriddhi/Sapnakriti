import { auth } from "@/lib/auth";
import { CartProvider } from "@/components/cart/CartProvider";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

// Customer-facing chrome. The admin area lives outside this group and shares none of it.
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const user = session?.user?.id ? { name: session.user.name } : null;

  return (
    <CartProvider>
      <Navbar user={user} />
      <main id="main">{children}</main>
      <Footer />
    </CartProvider>
  );
}
