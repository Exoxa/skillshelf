"use client";

import type { ReactNode } from "react";

// A submit button that asks first. Used for anything that deletes.
export function ConfirmSubmit({
  children,
  message,
  className,
}: {
  children: ReactNode;
  message: string;
  className?: string;
}) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
