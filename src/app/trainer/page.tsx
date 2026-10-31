import type { Metadata } from "next";
import Link from "next/link";
import { requireTrainer } from "@/lib/auth";
import { describePrice, listCourses } from "@/lib/courses";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { deleteCourse, setCoursePublished } from "./actions";

export const metadata: Metadata = { title: "Your courses" };

const MESSAGES: Record<string, string> = {
  sales:
    "That course has sales, so it cannot be deleted. Unpublish it instead — students who paid keep access.",
  delete: "Could not delete that course. Please try again.",
  save: "Could not save that change. Please try again.",
};

export default async function TrainerPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const profile = await requireTrainer("/trainer");
  const params = await searchParams;
  const courses = await listCourses();
  const message = params.error ? MESSAGES[params.error] : undefined;

  return (
    <main className="flex-1">
      <section className="mx-auto w-full max-w-3xl px-5 py-10">
        <p className="text-xs font-semibold tracking-wide text-muted uppercase">
          Trainer
        </p>
        <div className="mt-2 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              Your courses
            </h1>
            <p className="mt-2 max-w-md text-muted">
              {profile.full_name ? `${profile.full_name}, ` : ""}
              add a course, fill it with lessons, then publish it when it is
              ready.
            </p>
          </div>
        </div>

        {message ? (
          <p
            role="status"
            className="mt-6 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-800"
          >
            {message}
          </p>
        ) : null}

        <Link
          href="/trainer/courses/new"
          className="mt-6 flex h-12 w-full items-center justify-center rounded-xl bg-brand px-4 text-[15px] font-medium text-white transition hover:opacity-95 sm:w-auto sm:px-5"
        >
          Add a course
        </Link>

        {courses.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-border bg-card p-6 text-center">
            <p className="font-medium">No courses yet</p>
            <p className="mt-1 text-sm text-muted">
              Your first course can be a single lesson. You can add more later.
            </p>
          </div>
        ) : (
          <ul className="mt-8 space-y-3">
            {courses.map((course) => {
              const lessons = course.lessons.length;

              return (
                <li
                  key={course.id}
                  className="rounded-2xl border border-border bg-card p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`/trainer/courses/${course.id}`}
                        className="block truncate text-[17px] font-medium hover:underline"
                      >
                        {course.title}
                      </Link>
                      {course.short_description ? (
                        <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted">
                          {course.short_description}
                        </p>
                      ) : null}
                    </div>

                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                        course.is_published
                          ? "bg-brand-soft text-brand"
                          : "border border-border text-muted"
                      }`}
                    >
                      {course.is_published ? "Published" : "Draft"}
                    </span>
                  </div>

                  <p className="mt-3 text-sm text-muted">
                    {describePrice(course.price_kobo)} ·{" "}
                    {lessons === 1 ? "1 lesson" : `${lessons} lessons`}
                  </p>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <Link
                      href={`/trainer/courses/${course.id}`}
                      className="inline-flex h-10 items-center rounded-lg border border-border px-3 text-sm font-medium"
                    >
                      Edit
                    </Link>

                    <form action={setCoursePublished}>
                      <input type="hidden" name="id" value={course.id} />
                      <input
                        type="hidden"
                        name="publish"
                        value={course.is_published ? "0" : "1"}
                      />
                      <button
                        type="submit"
                        className="inline-flex h-10 items-center rounded-lg border border-border px-3 text-sm font-medium"
                      >
                        {course.is_published ? "Unpublish" : "Publish"}
                      </button>
                    </form>

                    <form action={deleteCourse}>
                      <input type="hidden" name="id" value={course.id} />
                      <ConfirmSubmit
                        message={`Delete "${course.title}" and all of its lessons? This cannot be undone.`}
                        className="inline-flex h-10 items-center rounded-lg px-3 text-sm font-medium text-red-700 hover:bg-red-50"
                      >
                        Delete
                      </ConfirmSubmit>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
