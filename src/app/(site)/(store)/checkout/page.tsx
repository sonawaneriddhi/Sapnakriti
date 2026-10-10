import type { Metadata } from "next";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { requireUserPage } from "@/lib/session";
import CheckoutClient, { type Profile } from "@/components/checkout/CheckoutClient";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  // Signed-out customers go to login and are returned here; their cart lives in the browser, so it is preserved.
  const sessionUser = await requireUserPage("/checkout");

  await connectDB();
  const user = await User.findById(sessionUser.id).lean();
  const addr = user?.addresses?.find((a) => a.isDefault) ?? user?.addresses?.[0];

  const profile: Profile = {
    fullName: addr?.fullName ?? user?.name ?? "",
    email: user?.email ?? sessionUser.email ?? "",
    phone: addr?.phone ?? user?.phone ?? "",
    line1: addr?.line1 ?? "",
    line2: addr?.line2 ?? "",
    city: addr?.city ?? "",
    state: addr?.state ?? "",
    postalCode: addr?.postalCode ?? "",
  };

  return <CheckoutClient profile={profile} />;
}
