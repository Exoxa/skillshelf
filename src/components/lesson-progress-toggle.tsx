"use client";

import { useActionState } from "react";
import {
  toggleLessonProgress,
  type ProgressState,
} from "@/app/(app)/actions";

const initial: ProgressState = {};

export function LessonProgressToggle({
  lessonId,
  courseSlug,
  isCompleted,
}: {
  lessonId: string;
  courseSlug: string;
  isCompleted: boolean;
}) {
  const [state, formAction] = useActionState(toggleLessonProgress, initial);

  return (
    <form action={formAction} className="flex items-center justify-between gap-3">
      <input type="hidden" name="lesson_id" value={lessonId} />
      <input type="hidden" name="course_slug" value={courseSlug} />
      <label className="flex items-center gap-3 text-sm">
        <input
          type="checkbox"
          name="is_completed"
          defaultChecked={isCompleted}
          className="size-4 accent-[var(--brand)]"
          onChange={(e) => e.currentTarget.form?.requestSubmit()}
        />
        <span className={isCompleted ? "text-muted line-through" : ""}>
          Mark as done
        </span>
      </label>
      {state.error ? (
        <span className="text-xs text-red-700">{state.error}</span>
      ) : null}
    </form>
  );
}
