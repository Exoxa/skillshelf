import { NextResponse } from "next/server";
import {
  fulfilPayment,
  getCourseForPayment,
  getPaymentByReference,
  markPaymentFailed,
  type VerifiedPayment,
} from "@/lib/payments";
import { isPaystackConfigured, isValidWebhookSignature } from "@/lib/paystack";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendWelcomeEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

type PaystackEvent = {
  event?: string;
  data?: VerifiedPayment;
};

async function sendWelcomeOnce(paymentId: string, studentId: string) {
  const admin = createAdminClient();

  // Only send once per enrolment; mark before sending to avoid duplicates on races.
  const { data: enrolment } = await admin
    .from("enrolments")
    .select("id, welcome_email_sent_at, course_id, student_id")
    .eq("payment_id", paymentId)
    .maybeSingle();

  if (!enrolment || enrolment.welcome_email_sent_at) return;

  const course = await getCourseForPayment(enrolment.course_id);
  if (!course) return;

  const { data: profile } = await admin
    .from("profiles")
    .select("email")
    .eq("id", enrolment.student_id)
    .maybeSingle();

  const to = profile?.email || "";
  if (!to) return;

  const result = await sendWelcomeEmail({
    to,
    courseTitle: course.title,
    courseSlug: course.slug,
  });

  if (result.ok) {
    await admin
      .from("enrolments")
      .update({ welcome_email_sent_at: new Date().toISOString() })
      .eq("id", enrolment.id);
  } else {
    console.error("welcome email failed", result.error);
  }
}

// Safety net for the callback. If the student closes the browser, or the
// redirect never arrives, Paystack still tells us the payment succeeded and the
// course opens. The signature proves the request came from Paystack.
export async function POST(request: Request) {
  if (!isPaystackConfigured) {
    return NextResponse.json(
      { ok: false, error: "Payments are not connected." },
      { status: 503 },
    );
  }

  // The signature is over the exact bytes, so read the body once as text.
  const rawBody = await request.text();
  const signature = request.headers.get("x-paystack-signature");

  if (!isValidWebhookSignature(rawBody, signature)) {
    return NextResponse.json(
      { ok: false, error: "Bad signature." },
      { status: 401 },
    );
  }

  let event: PaystackEvent;
  try {
    event = JSON.parse(rawBody) as PaystackEvent;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Bad body." },
      { status: 400 },
    );
  }

  const data = event.data;
  if (!data?.reference) {
    // Signed, but nothing for us to do. Acknowledge so Paystack stops retrying.
    return NextResponse.json({ ok: true });
  }

  if (event.event === "charge.success") {
    const result = await fulfilPayment({
      reference: data.reference,
      transaction: data,
    });

    if (!result.ok) {
      console.error(
        "paystack webhook: could not fulfil",
        data.reference,
        result.error,
      );
      // Ask Paystack to retry: a temporary database problem should not leave a
      // paid student locked out. A genuine mismatch keeps failing loudly in the
      // logs instead of granting access.
      return NextResponse.json(
        { ok: false, error: "Not fulfilled." },
        { status: 500 },
      );
    }

    const payment = await getPaymentByReference(data.reference);
    if (payment) {
      await sendWelcomeOnce(payment.id, payment.student_id);
    }
  } else if (event.event === "charge.failed") {
    await markPaymentFailed(data.reference, data);
  }

  return NextResponse.json({ ok: true });
}
