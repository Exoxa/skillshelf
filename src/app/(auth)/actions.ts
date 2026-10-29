"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { env, isSupabaseConfigured } from "@/lib/env";
import { safeNext } from "@/lib/redirects";

export type AuthState = {
  error?: string;
  message?: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Keeps the app usable while the Supabase keys are still being added.
function notConnected(): AuthState | null {
  if (isSupabaseConfigured) return null;
  return { error: "Accounts are not connected yet. Add the Supabase keys first." };
}

export async function login(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const early = notConnected();
  if (early) return early;

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(String(formData.get("next") ?? "/"));

  if (!EMAIL_RE.test(email) || !password) {
    return { error: "Enter your email and password." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "That email and password do not match." };
  }

  redirect(next);
}

export async function signup(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const early = notConnected();
  if (early) return early;

  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!fullName) return { error: "Enter your name." };
  if (!EMAIL_RE.test(email)) return { error: "Enter a valid email address." };
  if (password.length < 8) {
    return { error: "Use at least 8 characters for your password." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${env.siteUrl}/auth/confirm`,
    },
  });

  if (error) {
    if (error.message.toLowerCase().includes("already registered")) {
      return { error: "That email already has an account. Try logging in." };
    }
    return { error: "Could not create your account. Please try again." };
  }

  // Email confirmation is off, so we have a session straight away.
  if (data.session) {
    redirect("/");
  }

  return {
    message:
      "Account created. Check your email for the confirmation link, then log in.",
  };
}

export async function requestPasswordReset(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const early = notConnected();
  if (early) return early;

  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!EMAIL_RE.test(email)) {
    return { error: "Enter a valid email address." };
  }

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${env.siteUrl}/auth/confirm?next=/reset-password`,
  });

  // Always the same answer, so this cannot be used to discover who has an account.
  return {
    message: "If that email has an account, a reset link is on its way.",
  };
}

export async function updatePassword(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const early = notConnected();
  if (early) return early;

  const password = String(formData.get("password") ?? "");

  if (password.length < 8) {
    return { error: "Use at least 8 characters for your password." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "This reset link has expired. Request a new one." };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { error: "Could not change your password. Please try again." };
  }

  redirect("/login?reset=1");
}
