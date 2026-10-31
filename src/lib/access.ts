import "server-only";

import type { Profile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// The one question that decides whether a lesson video opens. Payments write
// the enrolment row in Stage 5; until then only the trainer can watch.
export async function hasCourseAccess(
  profile: Profile | null,
  courseId: string,
): Promise<boolean> {
  if (!profile) return false;
  if (profile.role === "trainer") return true;

  const supabase = await createClient();
  const { data } = await supabase
    .from("enrolments")
    .select("id")
    .eq("student_id", profile.id)
    .eq("course_id", courseId)
    .maybeSingle();

  return Boolean(data);
}
