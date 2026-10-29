// Only allow internal paths, so `next` cannot send anyone off-site.
export function safeNext(value: string | null | undefined, fallback = "/") {
  if (!value) return fallback;
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}
