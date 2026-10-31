import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getProfile } from "@/lib/auth";
import { hasCourseAccess } from "@/lib/access";
import { getCourseBySlug, getLesson } from "@/lib/courses";
import { getLessonVideo } from "@/lib/video";

type Params = {
  params: Promise<{ slug: string; lessonId: string }>;
};

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug, lessonId } = await params;
  const course = await getCourseBySlug(slug);
  if (!course) return { title: "Lesson not found" };

  const lesson = await getLesson(course.id, lessonId);
  if (!lesson) return { title: "Lesson not found" };

  return { title: `${lesson.title} · ${course.title}` };
}

export default async function LessonPage({ params }: Params) {
  const { slug, lessonId } = await params;

  const course = await getCourseBySlug(slug);
  if (!course) notFound();

  const [lesson, profile] = await Promise.all([
    getLesson(course.id, lessonId),
    getProfile(),
  ]);

  if (!lesson) notFound();

  if (!profile) {
    redirect(
      `/login?next=${encodeURIComponent(`/courses/${slug}/lessons/${lessonId}`)}`,
    );
  }

  const isTrainer = profile.role === "trainer";

  if (!course.is_published && !isTrainer) notFound();

  // The same check runs again in the video route for every request. This one
  // only decides what the page shows.
  const canWatch = await hasCourseAccess(profile, course.id);
  if (!canWatch) redirect(`/courses/${slug}?locked=1`);

  const video = await getLessonVideo(lesson.id);

  const playable = course.lessons.filter((item) =>
    isTrainer ? true : item.is_published,
  );
  const index = playable.findIndex((item) => item.id === lesson.id);
  const previous = index > 0 ? playable[index - 1] : null;
  const next = index >= 0 && index < playable.length - 1 ? playable[index + 1] : null;

  return (
    <main className="flex-1">
      <section className="mx-auto w-full max-w-3xl px-5 py-8 sm:py-10">
        <Link
          href={`/courses/${course.slug}`}
          className="text-sm text-muted transition-colors hover:text-foreground"
        >
          ← {course.title}
        </Link>

        <p className="mt-5 text-xs font-semibold tracking-wide text-muted uppercase">
          Lesson {index + 1} of {playable.length}
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
          {lesson.title}
        </h1>
        {lesson.is_published ? null : (
          <p className="mt-3 inline-block rounded-full border border-border px-2.5 py-1 text-xs text-muted">
            Hidden from students
          </p>
        )}

        <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-black">
          {video ? (
            <video
              key={lesson.id}
              controls
              playsInline
              preload="metadata"
              className="aspect-video w-full"
              src={`/api/lessons/${lesson.id}/video`}
            >
              Your browser cannot play this video.
            </video>
          ) : (
            <div className="grid aspect-video w-full place-items-center bg-card px-6 text-center">
              <div>
                <p className="font-medium">
                  {isTrainer ? "No video on this lesson yet" : "Video coming soon"}
                </p>
                <p className="mt-1 text-sm text-muted">
                  {isTrainer
                    ? "Add the video on the lesson page in your trainer area."
                    : "The trainer is still adding this lesson."}
                </p>
              </div>
            </div>
          )}
        </div>

        <p className="mt-3 text-xs leading-relaxed text-muted">
          {isTrainer
            ? "This is a preview. Students see the same player, but only after they have paid."
            : "The video link is private to your account. It stops working after an hour, so open the lesson again if you leave it paused for a long time."}
        </p>

        {previous || next ? (
          <nav className="mt-8 flex items-center justify-between gap-3 border-t border-border pt-5 text-sm">
            {previous ? (
              <Link
                href={`/courses/${course.slug}/lessons/${previous.id}`}
                className="min-w-0 text-muted transition-colors hover:text-foreground"
              >
                ← <span className="truncate">{previous.title}</span>
              </Link>
            ) : (
              <span />
            )}

            {next ? (
              <Link
                href={`/courses/${course.slug}/lessons/${next.id}`}
                className="min-w-0 text-right font-medium text-brand hover:underline"
              >
                <span className="truncate">{next.title}</span> →
              </Link>
            ) : null}
          </nav>
        ) : null}
      </section>
    </main>
  );
}
