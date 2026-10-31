import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import { listCourses, type Course } from "@/lib/courses";

export type ProgressMap = Record<string, boolean>;

export async function getProgressForLessons(
  lessonIds: string[],
): Promise<ProgressMap> {
  if (lessonIds.length === 0) return {};

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return {};

  const { data } = await supabase
    .from("lesson_progress")
    .select("lesson_id, is_completed")
    .eq("student_id", user.id)
    .eq("is_completed", true)
    .in("lesson_id", lessonIds);

  const map: ProgressMap = {};
  for (const row of data ?? []) {
    map[row.lesson_id] = true;
  }
  return map;
}

export async function getMyCourses(): Promise<Course[]> {
  const profile = await getProfile();
  if (!profile || profile.role !== "student") return [];

  const supabase = await createClient();

  const { data: enrolments } = await supabase
    .from("enrolments")
    .select("course_id")
    .eq("student_id", profile.id);

  const courseIds = (enrolments ?? []).map((e) => e.course_id);
  if (courseIds.length === 0) return [];

  const allCourses = await listCourses();
  return allCourses.filter((course) => courseIds.includes(course.id));
}

export async function getFirstUnfinishedLesson(
  _courseId: string,
  lessonIds: string[],
): Promise<string | null> {
  const progress = await getProgressForLessons(lessonIds);
  for (const lessonId of lessonIds) {
    if (!progress[lessonId]) return lessonId;
  }
  return lessonIds[0] ?? null;
}
