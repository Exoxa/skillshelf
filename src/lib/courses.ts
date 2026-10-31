import "server-only";

import { createClient } from "@/lib/supabase/server";

export type Lesson = {
  id: string;
  course_id: string;
  title: string;
  position: number;
  is_published: boolean;
};

export type Course = {
  id: string;
  slug: string;
  title: string;
  short_description: string;
  description: string;
  price_kobo: number;
  is_published: boolean;
  lessons: Lesson[];
};

const COURSE_FIELDS =
  "id, slug, title, short_description, description, price_kobo, is_published";

const LESSON_FIELDS = "id, course_id, title, position, is_published";

function groupLessons(
  courses: Omit<Course, "lessons">[],
  lessons: Lesson[],
): Course[] {
  const byCourse = new Map<string, Lesson[]>();

  for (const lesson of lessons) {
    const list = byCourse.get(lesson.course_id) ?? [];
    list.push(lesson);
    byCourse.set(lesson.course_id, list);
  }

  return courses.map((course) => ({
    ...course,
    lessons: byCourse.get(course.id) ?? [],
  }));
}

// Trainer sees every course, published or not, because the database rules
// allow it. A student calling the same query only gets published ones.
export async function listCourses(): Promise<Course[]> {
  const supabase = await createClient();

  const { data: courses, error } = await supabase
    .from("courses")
    .select(COURSE_FIELDS)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);

  const { data: lessons } = await supabase
    .from("lessons")
    .select(LESSON_FIELDS)
    .order("position", { ascending: true });

  return groupLessons(courses ?? [], lessons ?? []);
}

export async function getCourse(id: string): Promise<Course | null> {
  const supabase = await createClient();

  const { data: course } = await supabase
    .from("courses")
    .select(COURSE_FIELDS)
    .eq("id", id)
    .maybeSingle();

  if (!course) return null;

  const { data: lessons } = await supabase
    .from("lessons")
    .select(LESSON_FIELDS)
    .eq("course_id", id)
    .order("position", { ascending: true });

  return { ...course, lessons: lessons ?? [] };
}

export async function getLesson(
  courseId: string,
  lessonId: string,
): Promise<Lesson | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("lessons")
    .select(LESSON_FIELDS)
    .eq("id", lessonId)
    .eq("course_id", courseId)
    .maybeSingle();

  return data ?? null;
}

export function formatNaira(kobo: number): string {
  const naira = Math.round(kobo / 100);
  return `₦${naira.toLocaleString("en-NG")}`;
}

export function describePrice(kobo: number): string {
  return kobo === 0 ? "Free" : formatNaira(kobo);
}
