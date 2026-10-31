import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { MAX_VIDEO_BYTES } from "@/lib/video-rules";

export { MAX_VIDEO_BYTES };
export {
  ALLOWED_VIDEO_TYPES,
  formatVideoSize,
  isAllowedVideoType,
} from "@/lib/video-rules";

// Videos live in one private bucket. The browser never gets a list of files:
// uploads use a one-off signed link, playback uses a link that expires.
export const VIDEO_BUCKET = "lesson-videos";

export type LessonVideo = {
  lesson_id: string;
  storage_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  uploaded_at: string;
};

function safeFileName(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(-60);

  return base || "video.mp4";
}

// A fresh path per upload means a replaced video never fights the CDN cache.
export function videoPath(lessonId: string, fileName: string): string {
  return `${lessonId}/${Date.now()}-${safeFileName(fileName)}`;
}

// The trainer's browser uploads straight to Supabase, so a large video never
// passes through the app server (Vercel stops request bodies at 4.5 MB).
export async function createUploadTarget(lessonId: string, fileName: string) {
  const admin = createAdminClient();
  const path = videoPath(lessonId, fileName);

  const { data, error } = await admin.storage
    .from(VIDEO_BUCKET)
    .createSignedUploadUrl(path);

  if (error || !data) {
    throw new Error(error?.message ?? "Could not start the upload");
  }

  const signedUrl = /^https?:\/\//i.test(data.signedUrl)
    ? data.signedUrl
    : `${env.supabaseUrl}/storage/v1${data.signedUrl.startsWith("/") ? "" : "/"}${data.signedUrl}`;

  return { path, token: data.token, signedUrl };
}

// Playback link: one hour is long enough for a lesson, short enough that a
// shared link goes stale quickly.
export async function createPlaybackUrl(storagePath: string, seconds = 3600) {
  const admin = createAdminClient();

  const { data, error } = await admin.storage
    .from(VIDEO_BUCKET)
    .createSignedUrl(storagePath, seconds);

  if (error || !data) return null;
  return data.signedUrl;
}

// Confirm the file really landed before we point a lesson at it. The size and
// type come from storage, not from the browser.
export async function getUploadInfo(
  storagePath: string,
): Promise<{ sizeBytes: number | null; mimeType: string | null } | null> {
  const admin = createAdminClient();
  const parts = storagePath.split("/");
  const name = parts.pop() ?? "";
  const folder = parts.join("/");

  const { data } = await admin.storage
    .from(VIDEO_BUCKET)
    .list(folder, { search: name, limit: 100 });

  const file = (data ?? []).find((item) => item.name === name);
  if (!file) return null;

  const size = file.metadata?.size;
  const type = file.metadata?.mimetype;

  return {
    sizeBytes: typeof size === "number" ? size : null,
    mimeType: typeof type === "string" ? type : null,
  };
}

export async function getLessonVideo(
  lessonId: string,
): Promise<LessonVideo | null> {
  const admin = createAdminClient();

  const { data } = await admin
    .from("lesson_assets")
    .select("lesson_id, storage_path, mime_type, size_bytes, uploaded_at")
    .eq("lesson_id", lessonId)
    .maybeSingle();

  return data ?? null;
}

export async function saveLessonVideo(input: {
  lessonId: string;
  storagePath: string;
  mimeType: string | null;
  sizeBytes: number | null;
}): Promise<{ error?: string }> {
  const admin = createAdminClient();

  // Remove the file this one replaces, but only after the new row is saved.
  const previous = await getLessonVideo(input.lessonId);

  const { error } = await admin.from("lesson_assets").upsert({
    lesson_id: input.lessonId,
    storage_path: input.storagePath,
    provider: "supabase",
    mime_type: input.mimeType,
    size_bytes: input.sizeBytes,
    uploaded_at: new Date().toISOString(),
  });

  if (error) return { error: error.message };

  if (previous && previous.storage_path !== input.storagePath) {
    await admin.storage.from(VIDEO_BUCKET).remove([previous.storage_path]);
  }

  return {};
}

export async function removeLessonVideo(lessonId: string): Promise<void> {
  const admin = createAdminClient();
  const current = await getLessonVideo(lessonId);

  await admin.from("lesson_assets").delete().eq("lesson_id", lessonId);

  if (current) {
    await admin.storage.from(VIDEO_BUCKET).remove([current.storage_path]);
  }
}

// Database rows cascade when a lesson or course is deleted, but files in the
// bucket do not. Clear them on the way out so stale videos do not pile up.
export async function removeVideosForLessons(
  lessonIds: string[],
): Promise<void> {
  if (lessonIds.length === 0) return;

  const admin = createAdminClient();
  const { data } = await admin
    .from("lesson_assets")
    .select("storage_path")
    .in("lesson_id", lessonIds);

  const paths = (data ?? []).map((row) => row.storage_path);
  if (paths.length > 0) {
    await admin.storage.from(VIDEO_BUCKET).remove(paths);
  }
}
