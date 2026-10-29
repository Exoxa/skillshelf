import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex flex-1 items-start justify-center px-5 py-10 sm:py-16">
      <div className="w-full max-w-sm">{children}</div>
    </main>
  );
}
