import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProfile } from "@/lib/auth";
import { hasCourseAccess } from "@/lib/access";
import { describePrice, getCourseBySlug } from "@/lib/courses";
import { paystackMode } from "@/lib/paystack";
import { ArrowRightIcon, LockIcon, PlayIcon } from "@/components/icons";

type Params = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ locked?: string; paid?: string }>;
};

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const course = await getCourseBySlug(slug);

  if (!course) return { title: "Course not found" };

  return {
    title: course.title,
    description:
      course.short_description ||
      `A short course from SkillShelf for ${describePrice(course.price_kobo)}.`,
  };
}

export default async function CoursePage({ params, searchParams }: Params) {
  const { slug } = await params;

  const course = await getCourseBySlug(slug);
  if (!course) notFound();

  const [profile, search] = await Promise.all([getProfile(), searchParams]);

  const isTrainer = profile?.role === "trainer";

  // A draft is only visible to the trainer, for a quick look before publishing.
  if (!course.is_published && !isTrainer) notFound();

  const canWatch = await hasCourseAccess(profile, course.id);
  const showLockedNote = search.locked === "1" && !canWatch;
  const showPaidNote = search.paid === "1" && canWatch;
  const showCheckingNote = search.paid === "1" && Boolean(profile) && !canWatch;

  const visibleLessons = course.lessons.filter((lesson) => lesson.is_published);
  const lessonCount = visibleLessons.length;
  const firstLesson = visibleLessons[0] ?? null;

  const paragraphs = course.description
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return (
    <main className="flex-1">
      <section className="mx-auto w-full max-w-3xl px-5 py-10">
        <Link
          href="/"
          className="text-sm text-muted transition-colors hover:text-foreground"
        >
          ← All courses
        </Link>

        {course.is_published ? null : (
          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm text-amber-900">
            <span className="font-medium">Draft.</span> Only you can see this
            page until you publish the course.
          </div>
        )}

        <h1 className="mt-5 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          {course.title}
        </h1>

        {course.short_description ? (
          <p className="mt-3 max-w-xl text-lg leading-relaxed text-muted">
            {course.short_description}
          </p>
        ) : null}

        <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted">
          <span className="rounded-full bg-brand-soft px-3 py-1 font-semibold text-brand">
            {describePrice(course.price_kobo)}
          </span>
          <span>{lessonCount === 1 ? "1 lesson" : `${lessonCount} lessons`}</span>
          <span aria-hidden="true">·</span>
          <span>Watch on your phone</span>
        </div>

        {showLockedNote ? (
          <p
            role="status"
            className="mt-5 rounded-xl border border-brand/20 bg-brand-soft px-3.5 py-3 text-sm text-brand"
          >
            That lesson is locked. Pay for the course to watch it.
          </p>
        ) : null}

        {showPaidNote ? (
          <p
            role="status"
            className="mt-5 rounded-xl border border-brand/20 bg-brand-soft px-3.5 py-3 text-sm text-brand"
          >
            Payment received — welcome! Your lessons are open.
          </p>
        ) : null}

        {showCheckingNote ? (
          <p
            role="status"
            className="mt-5 rounded-xl border border-border bg-card px-3.5 py-3 text-sm text-muted"
          >
            We are still checking your payment. Refresh this page in a moment.
          </p>
        ) : null}

        <div className="mt-7 rounded-2xl border border-border bg-card p-5">
          {isTrainer ? (
            <>
              <p className="font-medium">This is your course.</p>
              <p className="mt-1 text-sm leading-relaxed text-muted">
                Students see this page once the course is published. Add lessons
                and video in your trainer area.
              </p>
              <Link
                href={`/trainer/courses/${course.id}`}
                className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 text-[15px] font-medium text-white transition hover:opacity-95 sm:w-auto sm:px-5"
              >
                Edit this course
                <ArrowRightIcon className="size-4" />
              </Link>
            </>
          ) : canWatch ? (
            <>
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-2xl font-semibold tracking-tight">
                  You have this course
                </p>
                <p className="text-xs text-muted">Lifetime access</p>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Your payment is on record. The lessons are open on this account.
              </p>
              {firstLesson ? (
                <Link
                  href={`/courses/${course.slug}/lessons/${firstLesson.id}`}
                  className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 text-[15px] font-medium text-white transition hover:opacity-95"
                >
                  {lessonCount > 1 ? "Start the first lesson" : "Open the lesson"}
                  <ArrowRightIcon className="size-4" />
                </Link>
              ) : (
                <p className="mt-4 rounded-xl border border-border bg-background px-3.5 py-3 text-sm text-muted">
                  The trainer is still adding lessons to this course.
                </p>
              )}
            </>
          ) : profile ? (
            <>
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-2xl font-semibold tracking-tight">
                  {describePrice(course.price_kobo)}
                </p>
                <p className="text-xs text-muted">One payment · lifetime access</p>
              </div>

              {course.price_kobo === 0 ? (
                <Link
                  href={`/checkout/${course.slug}`}
                  className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 text-[15px] font-medium text-white transition hover:opacity-95"
                >
                  Get this course free
                  <ArrowRightIcon className="size-4" />
                </Link>
              ) : paystackMode !== "off" ? (
                <Link
                  href={`/checkout/${course.slug}`}
                  className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 text-[15px] font-medium text-white transition hover:opacity-95"
                >
                  Buy this course
                  <ArrowRightIcon className="size-4" />
                </Link>
              ) : (
                <p
                  role="status"
                  className="mt-4 rounded-xl border border-border bg-background px-3.5 py-3 text-sm text-muted"
                >
                  Card payment is not open yet. Check back soon — nothing has
                  been charged.
                </p>
              )}

              {paystackMode !== "off" && course.price_kobo > 0 ? (
                <p className="mt-3 text-center text-xs leading-relaxed text-muted">
                  Pay by card in naira on Paystack. The lessons open as soon as
                  the payment is confirmed.
                </p>
              ) : null}

              {paystackMode === "test" && course.price_kobo > 0 ? (
                <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-center text-xs leading-relaxed text-amber-900">
                  Test mode. No real money is charged right now.
                </p>
              ) : null}
            </>
          ) : (
            <>
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-2xl font-semibold tracking-tight">
                  {describePrice(course.price_kobo)}
                </p>
                <p className="text-xs text-muted">One payment · lifetime access</p>
              </div>
              <Link
                href={`/login?next=${encodeURIComponent(`/courses/${course.slug}`)}`}
                className="mt-4 flex h-12 w-full items-center justify-center rounded-xl bg-brand px-4 text-[15px] font-medium text-white transition hover:opacity-95"
              >
                Sign in to buy
              </Link>
              <p className="mt-3 text-center text-xs leading-relaxed text-muted">
                New here? Signing in takes a minute and your lessons stay in your
                account.
              </p>
            </>
          )}
        </div>

        {paragraphs.length > 0 ? (
          <section aria-labelledby="about-heading" className="mt-10">
            <h2
              id="about-heading"
              className="text-xs font-semibold tracking-wide text-muted uppercase"
            >
              About this course
            </h2>
            <div className="mt-3 space-y-3 text-[15px] leading-relaxed">
              {paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </section>
        ) : null}

        <section aria-labelledby="lessons-heading" className="mt-10">
          <div className="flex items-baseline justify-between gap-3">
            <h2
              id="lessons-heading"
              className="text-xs font-semibold tracking-wide text-muted uppercase"
            >
              Lessons
            </h2>
            <span className="text-xs text-muted">
              {canWatch ? "Tap a lesson to watch" : "Unlock after payment"}
            </span>
          </div>

          {course.lessons.length === 0 ? (
            <p className="mt-4 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-muted">
              The trainer is still adding lessons to this course.
            </p>
          ) : (
            <ol className="mt-4 divide-y divide-border rounded-2xl border border-border bg-card px-4">
              {course.lessons.map((lesson, index) => {
                const row = (
                  <>
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand-soft text-xs font-semibold text-brand">
                      {index + 1}
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-snug font-medium">
                        {lesson.title}
                      </p>
                      {lesson.is_published ? null : (
                        <span className="mt-1 inline-block rounded-full border border-border px-2 py-0.5 text-[11px] text-muted">
                          Hidden from students
                        </span>
                      )}
                    </div>

                    <span className="inline-flex shrink-0 items-center gap-1.5 text-muted">
                      {canWatch ? (
                        <>
                          <PlayIcon className="size-4" />
                          <span className="sr-only">Watch</span>
                        </>
                      ) : (
                        <>
                          <LockIcon className="size-4" />
                          <span className="sr-only">Locked</span>
                        </>
                      )}
                    </span>
                  </>
                );

                return (
                  <li key={lesson.id}>
                    {canWatch ? (
                      <Link
                        href={`/courses/${course.slug}/lessons/${lesson.id}`}
                        className="flex items-center gap-3 py-3.5 transition-colors hover:text-brand"
                      >
                        {row}
                      </Link>
                    ) : (
                      <div className="flex items-center gap-3 py-3.5">{row}</div>
                    )}
                  </li>
                );
              })}
            </ol>
          )}

          <p className="mt-3 text-xs leading-relaxed text-muted">
            Lessons open only for the student who paid for this course, on her
            own account. The video link is checked on the server every time.
          </p>
        </section>
      </section>
    </main>
  );
}
