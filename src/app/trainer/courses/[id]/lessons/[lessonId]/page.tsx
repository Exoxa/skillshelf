import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTrainer } from "@/lib/auth";
import { getCourse, getLesson } from "@/lib/courses";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { LessonForm } from "@/components/trainer/lesson-form";
import { deleteLesson } from "../../../../actions";

export const metadata: Metadata = { title: "Edit lesson" };

export default async function EditLessonPage({
  params,
}: {
  params: Promise<{ id: string; lessonId: string }>;
}) {
  const { id, lessonId } = await params;
  await requireTrainer(`/trainer/courses/${id}/lessons/${lessonId}`);

  const [course, lesson] = await Promise.all([
    getCourse(id),
    getLesson(id, lessonId),
  ]);

  if (!course || !lesson) notFound();

  return (
    <main className="flex-1">
      <section className="mx-auto w-full max-w-3xl px-5 py-10">
        <Link
          href={`/trainer/courses/${id}`}
          className="text-sm text-muted transition-colors hover:text-foreground"
        >
          ← Back to {course.title}
        </Link>

        <h1 className="mt-4 text-2xl font-semibold tracking-tight">
          Edit lesson
        </h1>
        <p className="mt-2 text-sm text-muted">
          Lesson {lesson.position + 1} of {course.lessons.length}. Video upload
          comes in the next stage.
        </p>

        <div className="mt-6 rounded-2xl border border-border bg-card p-5">
          <LessonForm
            courseId={course.id}
            lesson={{
              id: lesson.id,
              title: lesson.title,
              is_published: lesson.is_published,
            }}
          />
        </div>

        <form action={deleteLesson} className="mt-6">
          <input type="hidden" name="id" value={lesson.id} />
          <input type="hidden" name="course_id" value={course.id} />
          <ConfirmSubmit
            message={`Delete the lesson "${lesson.title}"? This cannot be undone.`}
            className="text-sm font-medium text-red-700 hover:underline"
          >
            Delete this lesson
          </ConfirmSubmit>
        </form>
      </section>
    </main>
  );
}
