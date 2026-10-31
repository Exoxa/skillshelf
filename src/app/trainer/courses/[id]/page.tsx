import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTrainer } from "@/lib/auth";
import { describePrice, getCourse } from "@/lib/courses";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { CourseForm } from "@/components/trainer/course-form";
import { AddLessonForm } from "@/components/trainer/lesson-form";
import { deleteLesson, moveLesson } from "../../actions";

export const metadata: Metadata = { title: "Edit course" };

export default async function EditCoursePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  await requireTrainer(`/trainer/courses/${id}`);

  const course = await getCourse(id);
  if (!course) notFound();

  const { error } = await searchParams;

  return (
    <main className="flex-1">
      <section className="mx-auto w-full max-w-3xl px-5 py-10">
        <Link
          href="/trainer"
          className="text-sm text-muted transition-colors hover:text-foreground"
        >
          ← Back to your courses
        </Link>

        <div className="mt-4 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {course.title}
            </h1>
            <p className="mt-1 text-sm text-muted">
              {describePrice(course.price_kobo)} ·{" "}
              {course.lessons.length === 1
                ? "1 lesson"
                : `${course.lessons.length} lessons`}
            </p>
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

        {error === "delete" ? (
          <p
            role="status"
            className="mt-5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-800"
          >
            Could not delete that lesson. Please try again.
          </p>
        ) : null}

        <div className="mt-6 rounded-2xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold">Course details</h2>
          <div className="mt-4">
            <CourseForm course={course} />
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold">
            Lessons{" "}
            <span className="font-normal text-muted">
              ({course.lessons.length})
            </span>
          </h2>

          {course.lessons.length === 0 ? (
            <p className="mt-3 text-sm text-muted">
              No lessons yet. Add the first one below.
            </p>
          ) : (
            <ol className="mt-4 divide-y divide-border">
              {course.lessons.map((lesson, index) => (
                <li key={lesson.id} className="flex items-center gap-3 py-3">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand-soft text-xs font-semibold text-brand">
                    {index + 1}
                  </span>

                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/trainer/courses/${course.id}/lessons/${lesson.id}`}
                      className="block truncate text-sm font-medium hover:underline"
                    >
                      {lesson.title}
                    </Link>
                    {lesson.is_published ? null : (
                      <span className="text-xs text-muted">Hidden</span>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <form action={moveLesson}>
                      <input type="hidden" name="id" value={lesson.id} />
                      <input type="hidden" name="course_id" value={course.id} />
                      <input type="hidden" name="direction" value="up" />
                      <button
                        type="submit"
                        aria-label={`Move ${lesson.title} up`}
                        disabled={index === 0}
                        className="grid size-9 place-items-center rounded-lg border border-border text-sm disabled:opacity-40"
                      >
                        ↑
                      </button>
                    </form>

                    <form action={moveLesson}>
                      <input type="hidden" name="id" value={lesson.id} />
                      <input type="hidden" name="course_id" value={course.id} />
                      <input type="hidden" name="direction" value="down" />
                      <button
                        type="submit"
                        aria-label={`Move ${lesson.title} down`}
                        disabled={index === course.lessons.length - 1}
                        className="grid size-9 place-items-center rounded-lg border border-border text-sm disabled:opacity-40"
                      >
                        ↓
                      </button>
                    </form>

                    <form action={deleteLesson}>
                      <input type="hidden" name="id" value={lesson.id} />
                      <input type="hidden" name="course_id" value={course.id} />
                      <ConfirmSubmit
                        message={`Delete the lesson "${lesson.title}"? This cannot be undone.`}
                        className="grid size-9 place-items-center rounded-lg text-muted hover:bg-red-50 hover:text-red-700"
                      >
                        ✕
                      </ConfirmSubmit>
                    </form>
                  </div>
                </li>
              ))}
            </ol>
          )}

          <div className="mt-5 border-t border-border pt-5">
            <h3 className="text-sm font-medium">Add a lesson</h3>
            <div className="mt-3">
              <AddLessonForm courseId={course.id} />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
