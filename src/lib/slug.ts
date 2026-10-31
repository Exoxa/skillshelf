import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

  return base || "course";
}

// Course links must stay readable, so a duplicate title becomes -2, -3, and so
// on instead of a random suffix.
export async function uniqueSlug(
  supabase: SupabaseClient,
  title: string,
): Promise<string> {
  const base = slugify(title);
  const { data } = await supabase
    .from("courses")
    .select("slug")
    .like("slug", `${base}%`);

  const taken = new Set((data ?? []).map((row) => row.slug));
  if (!taken.has(base)) return base;

  for (let n = 2; n < 100; n += 1) {
    const candidate = `${base}-${n}`;
    if (!taken.has(candidate)) return candidate;
  }

  return `${base}-${Date.now()}`;
}
