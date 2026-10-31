import type { Metadata } from "next";
import Link from "next/link";
import { requireTrainer } from "@/lib/auth";
import { CourseForm } from "@/components/trainer/course-form";

export const metadata: Metadata = { title: "New course" };

export default async function NewCoursePage() {
  await requireTrainer("/trainer/courses/new");

  return (
    <main className="flex-1">
      <section className="mx-auto w-full max-w-3xl px-5 py-10">
        <Link
          href="/trainer"
          className="text-sm text-muted transition-colors hover:text-foreground"
        >
          ← Back to your courses
        </Link>

        <h1 className="mt-4 text-2xl font-semibold tracking-tight">
          New course
        </h1>
        <p className="mt-2 text-sm text-muted">
          Start with the title and price. Lessons come next.
        </p>

        <div className="mt-6 rounded-2xl border border-border bg-card p-5">
          <CourseForm />
        </div>
      </section>
    </main>
  );
}
