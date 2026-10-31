"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ProgressState = {
  error?: string;
  saved?: boolean;
};

export async function toggleLessonProgress(
  _prev: ProgressState,
  formData: FormData,
): Promise<ProgressState> {
  const lessonId = String(formData.get("lesson_id") ?? "").trim();
  const courseSlug = String(formData.get("course_slug") ?? "").trim();
  const isCompleted = formData.get("is_completed") === "on";

  if (!lessonId) {
    return { error: "That lesson was not found." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Sign in to save your progress." };
  }

  // Only allow progress for lessons the student can actually access. RLS also
  // enforces this, but we check explicitly so the UI can show a clear message.
  const { data: lesson } = await supabase
    .from("lessons")
    .select("id")
    .eq("id", lessonId)
    .maybeSingle();

  if (!lesson) {
    return { error: "That lesson was not found." };
  }

  if (isCompleted) {
    const { error } = await supabase.from("lesson_progress").upsert(
      {
        student_id: user.id,
        lesson_id: lessonId,
        is_completed: true,
        completed_at: new Date().toISOString(),
      },
      { onConflict: "student_id,lesson_id" },
    );

    if (error) {
      return { error: "Could not save your progress. Please try again." };
    }
  } else {
    const { error } = await supabase
      .from("lesson_progress")
      .delete()
      .eq("student_id", user.id)
      .eq("lesson_id", lessonId);

    if (error) {
      return { error: "Could not update your progress. Please try again." };
    }
  }

  if (courseSlug) {
    revalidatePath(`/courses/${courseSlug}`);
    revalidatePath(`/courses/${courseSlug}/lessons/${lessonId}`);
  }
  revalidatePath("/my-courses");
  revalidatePath("/", "layout");

  return { saved: true };
}
