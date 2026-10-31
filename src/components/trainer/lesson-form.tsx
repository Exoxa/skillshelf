"use client";

import { useActionState, useEffect, useRef } from "react";
import {
  createLesson,
  updateLesson,
  type FormState,
} from "@/app/trainer/actions";
import { Alert, Field, Input, SubmitButton } from "@/components/form";

const initial: FormState = {};

export function LessonForm({
  courseId,
  lesson,
}: {
  courseId: string;
  lesson: { id: string; title: string; is_published: boolean };
}) {
  const [state, formAction] = useActionState(updateLesson, initial);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="id" value={lesson.id} />
      <input type="hidden" name="course_id" value={courseId} />

      {state.error ? <Alert>{state.error}</Alert> : null}
      {state.saved ? <Alert tone="info">Saved.</Alert> : null}

      <Field label="Lesson title" htmlFor="title">
        <Input
          id="title"
          name="title"
          defaultValue={lesson.title}
          maxLength={90}
          required
        />
      </Field>

      <label className="flex items-start gap-3 rounded-xl border border-border bg-card px-3.5 py-3">
        <input
          type="checkbox"
          name="is_published"
          defaultChecked={lesson.is_published}
          className="mt-0.5 size-4 accent-[var(--brand)]"
        />
        <span className="text-sm">
          <span className="font-medium">Visible to students</span>
          <span className="mt-0.5 block text-xs leading-relaxed text-muted">
            Turn this off while you are still working on the lesson. It stays
            hidden from the course page.
          </span>
        </span>
      </label>

      <SubmitButton pendingLabel="Saving…">Save lesson</SubmitButton>
    </form>
  );
}

export function AddLessonForm({ courseId }: { courseId: string }) {
  const [state, formAction] = useActionState(createLesson, initial);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.saved) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <input type="hidden" name="course_id" value={courseId} />

      {state.error ? <Alert>{state.error}</Alert> : null}
      {state.saved ? <Alert tone="info">Lesson added.</Alert> : null}

      <div className="flex gap-2">
        <div className="flex-1">
          <label htmlFor="new-lesson-title" className="sr-only">
            New lesson title
          </label>
          <Input
            id="new-lesson-title"
            name="title"
            placeholder="Lesson title, for example: Light and shadow"
            maxLength={90}
            required
          />
        </div>

        <button
          type="submit"
          className="flex h-12 shrink-0 items-center justify-center rounded-xl bg-brand px-4 text-sm font-medium text-white transition hover:opacity-95 disabled:opacity-60"
        >
          Add
        </button>
      </div>

      <p className="text-xs text-muted">
        The lesson is added at the end. You can move it up afterwards.
      </p>
    </form>
  );
}
