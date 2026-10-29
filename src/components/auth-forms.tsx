"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  login,
  requestPasswordReset,
  signup,
  updatePassword,
  type AuthState,
} from "@/app/(auth)/actions";
import { Alert, Field, Input, SubmitButton } from "@/components/form";

const initial: AuthState = {};

export function LoginForm({ next }: { next: string }) {
  const [state, formAction] = useActionState(login, initial);

  return (
    <form action={formAction} className="space-y-4">
      {state.error ? <Alert>{state.error}</Alert> : null}

      <input type="hidden" name="next" value={next} />

      <Field label="Email" htmlFor="email">
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="you@example.com"
          required
        />
      </Field>

      <Field label="Password" htmlFor="password">
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </Field>

      <SubmitButton pendingLabel="Signing in…">Sign in</SubmitButton>

      <div className="flex items-center justify-between text-sm">
        <Link href="/forgot-password" className="text-brand hover:underline">
          Forgot password?
        </Link>
        <Link href="/signup" className="text-muted hover:text-foreground">
          Create account
        </Link>
      </div>
    </form>
  );
}

export function SignupForm() {
  const [state, formAction] = useActionState(signup, initial);

  return (
    <form action={formAction} className="space-y-4">
      {state.error ? <Alert>{state.error}</Alert> : null}
      {state.message ? <Alert tone="info">{state.message}</Alert> : null}

      <Field label="Your name" htmlFor="full_name">
        <Input
          id="full_name"
          name="full_name"
          autoComplete="name"
          placeholder="Ada Obi"
          required
        />
      </Field>

      <Field label="Email" htmlFor="email">
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="you@example.com"
          required
        />
      </Field>

      <Field label="Password" htmlFor="password" hint="At least 8 characters.">
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </Field>

      <SubmitButton pendingLabel="Creating account…">
        Create account
      </SubmitButton>

      <p className="text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="text-brand hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, formAction] = useActionState(requestPasswordReset, initial);

  return (
    <form action={formAction} className="space-y-4">
      {state.error ? <Alert>{state.error}</Alert> : null}
      {state.message ? <Alert tone="info">{state.message}</Alert> : null}

      <Field
        label="Email"
        htmlFor="email"
        hint="We will send a link to set a new password."
      >
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="you@example.com"
          required
        />
      </Field>

      <SubmitButton pendingLabel="Sending…">Send reset link</SubmitButton>

      <p className="text-center text-sm">
        <Link href="/login" className="text-muted hover:text-foreground">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}

export function ResetPasswordForm() {
  const [state, formAction] = useActionState(updatePassword, initial);

  return (
    <form action={formAction} className="space-y-4">
      {state.error ? <Alert>{state.error}</Alert> : null}

      <Field
        label="New password"
        htmlFor="password"
        hint="At least 8 characters."
      >
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </Field>

      <SubmitButton pendingLabel="Saving…">Save new password</SubmitButton>
    </form>
  );
}
