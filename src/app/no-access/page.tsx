import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "No access" };

export default function NoAccessPage() {
  return (
    <main className="flex flex-1 items-start justify-center px-5 py-16">
      <div className="w-full max-w-sm space-y-4 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          You need to buy this course
        </h1>
        <p className="text-sm leading-relaxed text-muted">
          Lessons open only for students who have paid for that course.
        </p>
        <Link
          href="/"
          className="inline-flex h-11 items-center justify-center rounded-xl border border-border px-4 text-sm font-medium"
        >
          Back to courses
        </Link>
      </div>
    </main>
  );
}
