"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireTrainer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { uniqueSlug } from "@/lib/slug";
import {
  MAX_VIDEO_BYTES,
  createUploadTarget,
  getUploadInfo,
  isAllowedVideoType,
  removeLessonVideo,
  removeVideosForLessons,
  saveLessonVideo,
} from "@/lib/video";

export type FormState = {
  error?: string;
  saved?: boolean;
};

const MAX_TITLE = 90;
const MAX_SHORT = 160;
const MAX_DESCRIPTION = 4000;

function text(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "").trim();
}

// Prices are shown and typed in whole naira, stored as kobo.
function parseNaira(raw: string): number | null {
  const cleaned = raw.replace(/[₦,\s]/g, "");
  if (!cleaned) return null;

  const value = Number(cleaned);
  if (!Number.isFinite(value) || value < 0 || value > 100_000_000) return null;

  return Math.round(value) * 100;
}

function validateCourse(formData: FormData) {
  const title = text(formData, "title");
  const shortDescription = text(formData, "short_description");
  const description = text(formData, "description");
  const priceKobo = parseNaira(text(formData, "price_naira"));

  if (title.length < 3) {
    return { error: "Give the course a title of at least 3 letters." } as const;
  }
  if (title.length > MAX_TITLE) {
    return { error: `Keep the title under ${MAX_TITLE} letters.` } as const;
  }
  if (shortDescription.length > MAX_SHORT) {
    return {
      error: `Keep the short description under ${MAX_SHORT} letters.`,
    } as const;
  }
  if (description.length > MAX_DESCRIPTION) {
    return { error: `Keep the description under ${MAX_DESCRIPTION} letters.` } as const;
  }
  if (priceKobo === null) {
    return { error: "Enter the price in naira, for example 15000. Use 0 for free." } as const;
  }

  return {
    values: {
      title,
      short_description: shortDescription,
      description,
      price_kobo: priceKobo,
      is_published: formData.get("is_published") === "on",
    },
  } as const;
}

function refresh(courseId?: string) {
  revalidatePath("/trainer");
  revalidatePath("/");
  if (courseId) revalidatePath(`/trainer/courses/${courseId}`);
}

export async function createCourse(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const profile = await requireTrainer("/trainer");
  const result = validateCourse(formData);
  if ("error" in result) return { error: result.error };

  const supabase = await createClient();
  const slug = await uniqueSlug(supabase, result.values.title);

  const { data, error } = await supabase
    .from("courses")
    .insert({ ...result.values, slug })
    .select("id")
    .single();

  if (error || !data) {
    return { error: "Could not save the course. Please try again." };
  }

  refresh(data.id);
  console.log("course created", { by: profile.id, courseId: data.id });
  redirect(`/trainer/courses/${data.id}`);
}

export async function updateCourse(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireTrainer("/trainer");

  const id = text(formData, "id");
  if (!id) return { error: "That course was not found." };

  const result = validateCourse(formData);
  if ("error" in result) return { error: result.error };

  const supabase = await createClient();
  const { error } = await supabase
    .from("courses")
    .update(result.values)
    .eq("id", id);

  if (error) return { error: "Could not save your changes. Please try again." };

  refresh(id);
  return { saved: true };
}

export async function setCoursePublished(formData: FormData): Promise<void> {
  await requireTrainer("/trainer");

  const id = text(formData, "id");
  const publish = text(formData, "publish") === "1";
  if (!id) redirect("/trainer");

  const supabase = await createClient();
  const { error } = await supabase
    .from("courses")
    .update({ is_published: publish })
    .eq("id", id);

  if (error) redirect("/trainer?error=save");

  refresh(id);
  redirect("/trainer");
}

export async function deleteCourse(formData: FormData): Promise<void> {
  await requireTrainer("/trainer");

  const id = text(formData, "id");
  if (!id) redirect("/trainer");

  const supabase = await createClient();

  // Anyone who has paid keeps access, so a sold course can only be unpublished.
  const { count } = await supabase
    .from("payments")
    .select("id", { count: "exact", head: true })
    .eq("course_id", id)
    .eq("status", "success");

  if ((count ?? 0) > 0) {
    redirect("/trainer?error=sales");
  }

  // Files in the bucket do not cascade with the rows, so clear them first.
  const { data: lessons } = await supabase
    .from("lessons")
    .select("id")
    .eq("course_id", id);

  await removeVideosForLessons((lessons ?? []).map((lesson) => lesson.id));

  const { error } = await supabase.from("courses").delete().eq("id", id);
  if (error) redirect("/trainer?error=delete");

  refresh();
  redirect("/trainer");
}

export async function createLesson(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireTrainer("/trainer");

  const courseId = text(formData, "course_id");
  const title = text(formData, "title");

  if (!courseId) return { error: "That course was not found." };
  if (title.length < 2) return { error: "Give the lesson a title." };
  if (title.length > MAX_TITLE) {
    return { error: `Keep the lesson title under ${MAX_TITLE} letters.` };
  }

  const supabase = await createClient();

  const { data: last } = await supabase
    .from("lessons")
    .select("position")
    .eq("course_id", courseId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("lessons").insert({
    course_id: courseId,
    title,
    position: (last?.position ?? -1) + 1,
  });

  if (error) return { error: "Could not add the lesson. Please try again." };

  refresh(courseId);
  return { saved: true };
}

export async function updateLesson(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireTrainer("/trainer");

  const id = text(formData, "id");
  const courseId = text(formData, "course_id");
  const title = text(formData, "title");

  if (!id || !courseId) return { error: "That lesson was not found." };
  if (title.length < 2) return { error: "Give the lesson a title." };
  if (title.length > MAX_TITLE) {
    return { error: `Keep the lesson title under ${MAX_TITLE} letters.` };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("lessons")
    .update({
      title,
      is_published: formData.get("is_published") === "on",
    })
    .eq("id", id)
    .eq("course_id", courseId);

  if (error) return { error: "Could not save the lesson. Please try again." };

  refresh(courseId);
  return { saved: true };
}

export async function deleteLesson(formData: FormData): Promise<void> {
  await requireTrainer("/trainer");

  const id = text(formData, "id");
  const courseId = text(formData, "course_id");
  if (!id || !courseId) redirect("/trainer");

  // The video file lives outside the database, so remove it by hand.
  await removeLessonVideo(id);

  const supabase = await createClient();
  const { error } = await supabase
    .from("lessons")
    .delete()
    .eq("id", id)
    .eq("course_id", courseId);

  if (error) redirect(`/trainer/courses/${courseId}?error=delete`);

  refresh(courseId);
  redirect(`/trainer/courses/${courseId}`);
}

export async function moveLesson(formData: FormData): Promise<void> {
  await requireTrainer("/trainer");

  const id = text(formData, "id");
  const courseId = text(formData, "course_id");
  const direction = text(formData, "direction");
  if (!id || !courseId) redirect("/trainer");

  const supabase = await createClient();
  const { data: lessons } = await supabase
    .from("lessons")
    .select("id, position")
    .eq("course_id", courseId)
    .order("position", { ascending: true });

  const list = lessons ?? [];
  const index = list.findIndex((lesson) => lesson.id === id);
  const target = direction === "up" ? index - 1 : index + 1;

  if (index === -1 || target < 0 || target >= list.length) {
    redirect(`/trainer/courses/${courseId}`);
  }

  const current = list[index];
  const swap = list[target];

  // Rewrite the whole order so duplicated positions from past edits heal.
  const reordered = [...list];
  reordered[index] = swap;
  reordered[target] = current;

  await Promise.all(
    reordered.map((lesson, position) =>
      supabase
        .from("lessons")
        .update({ position })
        .eq("id", lesson.id)
        .eq("course_id", courseId),
    ),
  );

  refresh(courseId);
  redirect(`/trainer/courses/${courseId}`);
}

// ---------------------------------------------------------------- lesson video

export type UploadTarget = { path: string; token: string; signedUrl: string };

async function findLesson(lessonId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("lessons")
    .select("id, course_id")
    .eq("id", lessonId)
    .maybeSingle();

  return data ?? null;
}

function refreshLesson(courseId: string, lessonId: string) {
  refresh(courseId);
  revalidatePath(`/trainer/courses/${courseId}/lessons/${lessonId}`);
  revalidatePath("/", "layout");
}

// Step 1: give the browser a one-off link. The video goes straight from the
// trainer's phone or laptop to storage, never through this server.
export async function createVideoUpload(input: {
  lessonId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}): Promise<{ error?: string; target?: UploadTarget }> {
  await requireTrainer("/trainer");

  const lessonId = String(input.lessonId ?? "").trim();
  const lesson = lessonId ? await findLesson(lessonId) : null;
  if (!lesson) return { error: "That lesson was not found." };

  if (!isAllowedVideoType(input.mimeType)) {
    return { error: "Use an MP4, WebM or MOV file." };
  }
  if (!Number.isFinite(input.sizeBytes) || input.sizeBytes <= 0) {
    return { error: "That file looks empty. Please pick the video again." };
  }
  if (input.sizeBytes > MAX_VIDEO_BYTES) {
    return {
      error: "That video is over 50 MB. Trim it or lower the quality, then try again.",
    };
  }

  const target = await createUploadTarget(lessonId, input.fileName);
  return { target };
}

// Step 2: the upload finished, so point the lesson at the file.
export async function saveVideoUpload(input: {
  lessonId: string;
  path: string;
  mimeType: string;
  sizeBytes: number;
}): Promise<{ error?: string; ok?: boolean }> {
  await requireTrainer("/trainer");

  const lessonId = String(input.lessonId ?? "").trim();
  const lesson = lessonId ? await findLesson(lessonId) : null;
  if (!lesson) return { error: "That lesson was not found." };

  const path = String(input.path ?? "");
  if (!path.startsWith(`${lessonId}/`)) {
    return { error: "That upload does not belong to this lesson." };
  }

  const info = await getUploadInfo(path);
  if (!info) {
    return { error: "The upload did not finish. Please try again." };
  }

  const saved = await saveLessonVideo({
    lessonId,
    storagePath: path,
    mimeType: info.mimeType ?? input.mimeType ?? null,
    sizeBytes: info.sizeBytes ?? input.sizeBytes ?? null,
  });

  if (saved.error) {
    return { error: "Could not save the video. Please try again." };
  }

  refreshLesson(lesson.course_id, lessonId);
  return { ok: true };
}

export async function removeVideoUpload(
  lessonId: string,
): Promise<{ error?: string; ok?: boolean }> {
  await requireTrainer("/trainer");

  const id = String(lessonId ?? "").trim();
  const lesson = id ? await findLesson(id) : null;
  if (!lesson) return { error: "That lesson was not found." };

  await removeLessonVideo(id);
  refreshLesson(lesson.course_id, id);
  return { ok: true };
}
