import type { Metadata } from "next";
import Link from "next/link";
import { getProfile } from "@/lib/auth";
import { describePrice, listCourses } from "@/lib/courses";
import { ArrowRightIcon } from "@/components/icons";

export const metadata: Metadata = {
  title: "Courses from a Lagos trainer",
  description:
    "Short courses you can watch on your phone. Pay once in naira and keep access to your lessons.",
};

export default async function Home() {
  const [profile, allCourses] = await Promise.all([getProfile(), listCourses()]);

  // The trainer sees drafts in the trainer area. This page is the shop window,
  // so it only ever shows published courses.
  const courses = allCourses.filter((course) => course.is_published);
  const isTrainer = profile?.role === "trainer";

  return (
    <main className="flex-1">
      <section className="mx-auto w-full max-w-3xl px-5 pt-12 pb-8 sm:pt-16">
        <p className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted">
          <span className="size-1.5 rounded-full bg-brand" />
          Lagos, Nigeria
        </p>

        <h1 className="mt-6 text-4xl font-semibold tracking-tight text-balance sm:text-5xl md:text-6xl">
          Short courses you can finish on your phone.
        </h1>

        <p className="mt-4 max-w-xl text-lg leading-relaxed text-pretty text-muted">
          Pay once in naira, then watch whenever you like. Your lessons stay in
          your account, ready when you are.
        </p>
      </section>

      <section
        aria-labelledby="courses-heading"
        className="mx-auto w-full max-w-3xl px-5 pb-16"
      >
        <div className="flex items-baseline justify-between gap-3">
          <h2
            id="courses-heading"
            className="text-xs font-semibold tracking-wide text-muted uppercase"
          >
            Courses
          </h2>
          {courses.length > 0 ? (
            <span className="text-xs text-muted">
              {courses.length === 1 ? "1 course" : `${courses.length} courses`}
            </span>
          ) : null}
        </div>

        {courses.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-border bg-card p-6">
            <p className="font-medium">
              {isTrainer ? "Nothing published yet" : "No courses open yet"}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              {isTrainer
                ? "Publish a course in your trainer area and it will show up here."
                : "The trainer is still putting the first course together. Check back soon."}
            </p>
            {isTrainer ? (
              <Link
                href="/trainer"
                className="mt-4 inline-flex h-11 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-medium text-white transition hover:opacity-95"
              >
                Go to your courses
                <ArrowRightIcon className="size-4" />
              </Link>
            ) : null}
          </div>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {courses.map((course) => {
              const lessons = course.lessons.filter(
                (lesson) => lesson.is_published,
              ).length;

              return (
                <li key={course.id}>
                  <Link
                    href={`/courses/${course.slug}`}
                    className="group flex h-full flex-col rounded-2xl border border-border bg-card/80 p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                  >
                    <h3 className="text-[17px] leading-snug font-medium">
                      {course.title}
                    </h3>

                    {course.short_description ? (
                      <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted">
                        {course.short_description}
                      </p>
                    ) : null}

                    <div className="mt-auto flex items-center justify-between gap-3 pt-5">
                      <span className="text-[15px] font-semibold text-brand">
                        {describePrice(course.price_kobo)}
                      </span>

                      <span className="inline-flex items-center gap-1.5 text-xs text-muted">
                        {lessons === 1 ? "1 lesson" : `${lessons} lessons`}
                        <ArrowRightIcon className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
