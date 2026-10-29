import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignupForm } from "@/components/auth-forms";
import { getProfile } from "@/lib/auth";

export const metadata: Metadata = { title: "Create account" };

export default async function SignupPage() {
  const profile = await getProfile();
  if (profile) redirect("/");

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Create account</h1>
        <p className="text-sm text-muted">
          You need an account so the lessons you pay for stay yours.
        </p>
      </div>

      <SignupForm />
    </div>
  );
}
