"use server";

import { redirect } from "next/navigation";
import { requireStudent } from "@/lib/auth";
import { hasCourseAccess } from "@/lib/access";
import { getCourseBySlug } from "@/lib/courses";
import { env } from "@/lib/env";
import {
  cancelPendingPayment,
  createPendingPayment,
  grantFreeEnrolment,
} from "@/lib/payments";
import { initializeTransaction, isPaystackConfigured } from "@/lib/paystack";

// Everything about the order is decided here, from the database, not from the
// form. A student could edit the hidden field to another course; the server
// still reads that course's real price.
export async function startCheckout(formData: FormData): Promise<void> {
  const slug = String(formData.get("slug") ?? "").trim();
  const profile = await requireStudent(`/checkout/${slug || ""}`);

  const course = slug ? await getCourseBySlug(slug) : null;
  if (!course) redirect("/");
  if (!course.is_published) redirect(`/courses/${course.slug}`);

  // The trainer owns the shop and never pays herself.
  if (profile.role === "trainer") redirect(`/courses/${course.slug}`);

  if (await hasCourseAccess(profile, course.id)) {
    redirect(`/courses/${course.slug}?paid=1`);
  }

  if (course.price_kobo === 0) {
    const granted = await grantFreeEnrolment({
      studentId: profile.id,
      courseId: course.id,
    });

    if (!granted.ok) {
      redirect(`/checkout/${course.slug}?error=free`);
    }

    redirect(`/courses/${course.slug}?paid=1`);
  }

  if (!isPaystackConfigured) {
    redirect(`/checkout/${course.slug}?error=setup`);
  }

  const created = await createPendingPayment({
    studentId: profile.id,
    courseId: course.id,
    amountKobo: course.price_kobo,
  });

  if (!created.payment) {
    redirect(`/checkout/${course.slug}?error=start`);
  }

  const started = await initializeTransaction({
    email: profile.email,
    amountKobo: created.payment.amount_kobo,
    reference: created.payment.reference,
    callbackUrl: `${env.siteUrl}/checkout/callback`,
    metadata: {
      course_id: course.id,
      course_slug: course.slug,
      student_id: profile.id,
    },
  });

  if (!started.data?.authorization_url) {
    // The student never reached Paystack, so this order is dead. Close it so a
    // stale "pending" row does not sit in the sales list.
    await cancelPendingPayment(created.payment.reference);
    redirect(`/checkout/${course.slug}?error=start`);
  }

  redirect(started.data.authorization_url);
}
