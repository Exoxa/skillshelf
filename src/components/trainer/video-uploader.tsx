"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createVideoUpload,
  removeVideoUpload,
  saveVideoUpload,
} from "@/app/trainer/actions";
import { Alert } from "@/components/form";
import {
  MAX_VIDEO_BYTES,
  VIDEO_ACCEPT,
  formatVideoSize,
  isAllowedVideoType,
} from "@/lib/video-rules";

type Phase = "idle" | "uploading" | "checking";

function putToStorage(
  url: string,
  file: File,
  onProgress: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.setRequestHeader("x-upsert", "false");

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Storage refused the file (${xhr.status}).`));
      }
    };
    xhr.onerror = () => reject(new Error("The upload was cut off."));
    xhr.onabort = () => reject(new Error("The upload was cancelled."));

    xhr.send(file);
  });
}

export function VideoUploader({
  lessonId,
  video,
}: {
  lessonId: string;
  video: { sizeBytes: number | null; uploadedAt: string } | null;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [percent, setPercent] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const busy = phase !== "idle";

  async function handleFile(file: File) {
    setError(null);
    setDone(false);

    if (!isAllowedVideoType(file.type)) {
      setError("Use an MP4, WebM or MOV file.");
      return;
    }
    if (file.size > MAX_VIDEO_BYTES) {
      setError(
        "That video is over 50 MB. Trim it or lower the quality, then try again.",
      );
      return;
    }

    try {
      setPhase("uploading");
      setPercent(0);

      const started = await createVideoUpload({
        lessonId,
        fileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
      });

      if (started.error || !started.target) {
        setError(started.error ?? "Could not start the upload.");
        setPhase("idle");
        return;
      }

      await putToStorage(started.target.signedUrl, file, setPercent);

      setPhase("checking");
      const saved = await saveVideoUpload({
        lessonId,
        path: started.target.path,
        mimeType: file.type,
        sizeBytes: file.size,
      });

      if (saved.error) {
        setError(saved.error);
        setPhase("idle");
        return;
      }

      setDone(true);
      setPhase("idle");
      setPercent(0);
      router.refresh();
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "The upload did not finish. Please try again.",
      );
      setPhase("idle");
    } finally {
      // Let the same file be chosen again after a failure.
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleRemove() {
    if (!window.confirm("Remove this video from the lesson?")) return;

    setError(null);
    setDone(false);
    setPhase("checking");

    const removed = await removeVideoUpload(lessonId);
    setPhase("idle");

    if (removed.error) {
      setError(removed.error);
      return;
    }

    router.refresh();
  }

  return (
    <div className="space-y-4">
      {error ? <Alert>{error}</Alert> : null}
      {done ? <Alert tone="info">Video saved.</Alert> : null}

      {video ? (
        <div className="rounded-xl border border-border bg-background px-3.5 py-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Video ready</p>
              <p className="mt-0.5 text-xs text-muted">
                {formatVideoSize(video.sizeBytes) || "Uploaded"} · replaces the
                last file
              </p>
            </div>
            <a
              href={`/api/lessons/${lessonId}/video`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 shrink-0 items-center rounded-lg border border-border px-3 text-sm font-medium"
            >
              Preview
            </a>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted">
          No video yet. Students see the lesson as locked until one is added.
        </p>
      )}

      {busy ? (
        <div>
          <div className="h-2 overflow-hidden rounded-full bg-border">
            <div
              className="h-full rounded-full bg-brand transition-[width]"
              style={{ width: `${phase === "checking" ? 100 : percent}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-muted">
            {phase === "checking"
              ? "Finishing up…"
              : `Uploading ${percent}% — keep this page open.`}
          </p>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="inline-flex h-11 items-center rounded-xl bg-brand px-4 text-sm font-medium text-white transition hover:opacity-95"
          >
            {video ? "Replace video" : "Choose video"}
          </button>

          {video ? (
            <button
              type="button"
              onClick={handleRemove}
              className="inline-flex h-11 items-center rounded-xl px-3 text-sm font-medium text-red-700 hover:bg-red-50"
            >
              Remove video
            </button>
          ) : null}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={VIDEO_ACCEPT}
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />

      <p className="text-xs leading-relaxed text-muted">
        MP4, WebM or MOV, up to 50 MB. The file goes straight to private
        storage. Students never get the file itself, only a link that expires.
      </p>
    </div>
  );
}
