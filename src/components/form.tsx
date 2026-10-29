"use client";

import type { ComponentProps, ReactNode } from "react";
import { useFormStatus } from "react-dom";

export const inputClass =
  "h-12 w-full rounded-xl border border-border bg-card px-3.5 text-[15px] text-foreground outline-none placeholder:text-muted/60 focus:border-brand focus:ring-2 focus:ring-brand/15";

export const buttonClass =
  "flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 text-[15px] font-medium text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60";

export function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium">
        {label}
      </label>
      {children}
      {hint ? <p className="text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

export function Input(props: ComponentProps<"input">) {
  return <input {...props} className={inputClass} />;
}

export function SubmitButton({
  children,
  pendingLabel,
}: {
  children: ReactNode;
  pendingLabel: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending} className={buttonClass}>
      {pending ? pendingLabel : children}
    </button>
  );
}

export function Alert({
  tone = "error",
  children,
}: {
  tone?: "error" | "info";
  children: ReactNode;
}) {
  const styles =
    tone === "error"
      ? "border-red-200 bg-red-50 text-red-800"
      : "border-brand/20 bg-brand-soft text-brand";

  return (
    <p role="status" className={`rounded-xl border px-3.5 py-3 text-sm ${styles}`}>
      {children}
    </p>
  );
}
