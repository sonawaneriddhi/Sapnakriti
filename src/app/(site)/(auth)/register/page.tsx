import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser, safeCallbackUrl } from "@/lib/session";
import AuthForm from "@/components/auth/AuthForm";

export const metadata: Metadata = { title: "Create account" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string }> }) {
  const { callbackUrl } = await searchParams;
  const target = safeCallbackUrl(callbackUrl);
  if (await getSessionUser()) redirect(target);
  return <AuthForm mode="register" callbackUrl={target} />;
}
