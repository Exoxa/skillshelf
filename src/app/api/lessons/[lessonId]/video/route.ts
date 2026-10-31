import { NextResponse, type NextRequest } from "next/server";
import { getProfile } from "@/lib/auth";
import { hasCourseAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { createPlaybackUrl, getLessonVideo } from "@/lib/video";

// Every request to a video goes through here. There is no public file URL and
// no long-lived link: the check runs, then the browser is sent to a signed URL
// that expires. This is the rule that keeps lessons paid-only.
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ lessonId: string }> },
) {
  const { lessonId } = await context.params;

  const profile = await getProfile();
  if (!profile) {
    return NextResponse.redirect(
      new URL(`/login?next=${encodeURIComponent(request.nextUrl.pathname)}`, request.url),
    );
  }

  const supabase = await createClient();
  const { data: lesson } = await supabase
    .from("lessons")
    .select("id, course_id, is_published")
    .eq("id", lessonId)
    .maybeSingle();

  // The database rules already hide hidden lessons and drafts from students,
  // so a missing row means "not for you" as much as "does not exist".
  if (!lesson) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const { data: course } = await supabase
    .from("courses")
    .select("slug, is_published")
    .eq("id", lesson.course_id)
    .maybeSingle();

  if (!course) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const isTrainer = profile.role === "trainer";

  if (!isTrainer && (!lesson.is_published || !course.is_published)) {
    return NextResponse.redirect(
      new URL(`/courses/${course.slug}?locked=1`, request.url),
    );
  }

  if (!(await hasCourseAccess(profile, lesson.course_id))) {
    return NextResponse.redirect(
      new URL(`/courses/${course.slug}?locked=1`, request.url),
    );
  }

  const video = await getLessonVideo(lessonId);
  if (!video) {
    return NextResponse.redirect(new URL(`/courses/${course.slug}`, request.url));
  }

  const signedUrl = await createPlaybackUrl(video.storage_path);
  if (!signedUrl) {
    return NextResponse.redirect(new URL(`/courses/${course.slug}`, request.url));
  }

  return NextResponse.redirect(signedUrl, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
