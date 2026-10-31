// Shared between the server and the upload button, so the limits never drift.

export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

export const ALLOWED_VIDEO_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-m4v",
];

export const VIDEO_ACCEPT = ALLOWED_VIDEO_TYPES.join(",");

export function isAllowedVideoType(type: string): boolean {
  return ALLOWED_VIDEO_TYPES.includes(type);
}

export function formatVideoSize(bytes: number | null): string {
  if (!bytes || bytes <= 0) return "";
  const mb = bytes / (1024 * 1024);
  return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
}
