import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireStudent } from "@/lib/auth";
import { describePrice } from "@/lib/courses";
import { getMyCourses } from "@/lib/progress";
import { getProgressForLessons } from "@/lib/progress";
import { ArrowRightIcon } from "@/components/icons";

export const metadata: Metadata = { title: "My courses" };

export default async function MyCoursesPage() {
  const profile = await requireStudent("/my-courses");
  if (profile.role === "trainer") {
    redirect("/trainer");
  }

  const courses = await getMyCourses();

  if (courses.length === 0) {
    return (
      <main className="flex-1">
        <section className="mx-auto w-full max-w-3xl px-5 py-10">
          <h1 className="text-2xl font-semibold tracking-tight">My courses</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            You do not have any courses yet. Once you pay for a course, it will
            show up here.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-medium text-white transition hover:opacity-95"
          >
            Browse courses
            <ArrowRightIcon className="size-4" />
          </Link>
        </section>
      </main>
    );
  }

  const courseProgress = await Promise.all(
    courses.map(async (course) => {
      const visibleLessons = course.lessons.filter((lesson) => lesson.is_published);
      const ids = visibleLessons.map((lesson) => lesson.id);
      const progress = await getProgressForLessons(ids);
      const completed = Object.keys(progress).length;
      const total = visibleLessons.length;
      const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
      return { course, completed, total, percent };
    }),
  );

  return (
    <main className="flex-1">
      <section className="mx-auto w-full max-w-3xl px-5 py-10">
        <h1 className="text-2xl font-semibold tracking-tight">My courses</h1>
        <p className="mt-2 text-sm text-muted">
          Pick up where you left off. Your progress is saved to your account.
        </p>

        <div className="mt-6 space-y-4">
          {courseProgress.map(({ course, completed, total, percent }) => (
            <article
              key={course.id}
              className="rounded-2xl border border-border bg-card p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold tracking-tight">
                    {course.title}
                  </h2>
                  {course.short_description ? (
                    <p className="mt-1 text-sm leading-relaxed text-muted">
                      {course.short_description}
                    </p>
                  ) : null}
                </div>
                <span className="rounded-full bg-brand-soft px-2.5 py-1 text-xs font-semibold text-brand">
                  {describePrice(course.price_kobo)}
                </span>
              </div>

              {total > 0 ? (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted">
                    <span>Progress</span>
                    <span>
                      {completed}/{total} done · {percent}%
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-border">
                    <div
                      className="h-full rounded-full bg-brand transition-[width]"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              ) : null}

              <div className="mt-5 flex flex-wrap gap-2">
                <Link
                  href={`/courses/${course.slug}`}
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-medium text-white transition hover:opacity-95"
                >
                  {percent === 100 ? "Review course" : "Continue learning"}
                  <ArrowRightIcon className="size-4" />
                </Link>
                <Link
                  href={`/courses/${course.slug}`}
                  className="inline-flex h-11 items-center rounded-xl px-3 text-sm font-medium text-muted transition-colors hover:text-foreground"
                >
                  Course details
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
