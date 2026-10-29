import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth-forms";
import { getProfile } from "@/lib/auth";
import { safeNext } from "@/lib/redirects";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; reset?: string }>;
}) {
  const params = await searchParams;
  const next = safeNext(params.next);

  const profile = await getProfile();
  if (profile) redirect(next);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="text-sm text-muted">
          Sign in to open the courses you have paid for.
        </p>
      </div>

      {params.reset ? (
        <p className="rounded-xl border border-brand/20 bg-brand-soft px-3.5 py-3 text-sm text-brand">
          Password changed. Sign in with your new password.
        </p>
      ) : null}

      <LoginForm next={next} />
    </div>
  );
}
