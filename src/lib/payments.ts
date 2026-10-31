import "server-only";

import { randomBytes } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

// Server-only writes. The browser can read its own payment rows, but it can
// never create or confirm one. That happens here, with the service-role key,
// after Paystack has been asked directly.

export type PaymentStatus = "pending" | "success" | "failed";

export type PaymentRow = {
  id: string;
  student_id: string;
  course_id: string;
  reference: string;
  amount_kobo: number;
  currency: string;
  status: PaymentStatus;
  paystack_reference: string | null;
  channel: string | null;
  paid_at: string | null;
  created_at: string;
};

export type VerifiedPayment = {
  status: string;
  reference: string;
  amount: number;
  currency: string;
  channel?: string | null;
  paid_at?: string | null;
  [key: string]: unknown;
};

type CourseSummary = { slug: string; title: string; price_kobo: number };

const PAYMENT_FIELDS =
  "id, student_id, course_id, reference, amount_kobo, currency, status, paystack_reference, channel, paid_at, created_at";

export function newReference(): string {
  const stamp = Date.now().toString(36).toUpperCase();
  const random = randomBytes(4).toString("hex").toUpperCase();
  return `SS-${stamp}-${random}`;
}

export async function createPendingPayment(input: {
  studentId: string;
  courseId: string;
  amountKobo: number;
}): Promise<{ payment?: PaymentRow; error?: string }> {
  const admin = createAdminClient();
  const reference = newReference();

  const { data, error } = await admin
    .from("payments")
    .insert({
      student_id: input.studentId,
      course_id: input.courseId,
      reference,
      amount_kobo: input.amountKobo,
      currency: "NGN",
      status: "pending",
    })
    .select(PAYMENT_FIELDS)
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Could not create the order." };
  }

  return { payment: data as PaymentRow };
}

export async function getPaymentByReference(
  reference: string,
): Promise<PaymentRow | null> {
  const admin = createAdminClient();

  const { data } = await admin
    .from("payments")
    .select(PAYMENT_FIELDS)
    .eq("reference", reference)
    .maybeSingle();

  return (data as PaymentRow | null) ?? null;
}

export async function getCourseForPayment(
  courseId: string,
): Promise<CourseSummary | null> {
  const admin = createAdminClient();

  const { data } = await admin
    .from("courses")
    .select("slug, title, price_kobo")
    .eq("id", courseId)
    .maybeSingle();

  return (data as CourseSummary | null) ?? null;
}

// Paystack returned an error before the student ever reached the payment page.
// The order never happened, so mark it failed instead of leaving it pending.
export async function cancelPendingPayment(reference: string): Promise<void> {
  const admin = createAdminClient();

  await admin
    .from("payments")
    .update({ status: "failed" })
    .eq("reference", reference)
    .eq("status", "pending");
}

export async function markPaymentFailed(
  reference: string,
  transaction?: VerifiedPayment,
): Promise<void> {
  const admin = createAdminClient();

  // Never overwrite a successful payment with a failed one.
  await admin
    .from("payments")
    .update({
      status: "failed",
      paystack_reference: transaction?.reference ?? null,
      channel: transaction?.channel ?? null,
      raw_payload: transaction ?? null,
    })
    .eq("reference", reference)
    .eq("status", "pending");
}

async function grantEnrolment(input: {
  studentId: string;
  courseId: string;
  paymentId: string;
}): Promise<{ ok: boolean; error?: string }> {
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("enrolments")
    .select("id, payment_id")
    .eq("student_id", input.studentId)
    .eq("course_id", input.courseId)
    .maybeSingle();

  if (existing) {
    if (!existing.payment_id) {
      await admin
        .from("enrolments")
        .update({ payment_id: input.paymentId })
        .eq("id", existing.id);
    }
    return { ok: true };
  }

  const { error } = await admin.from("enrolments").insert({
    student_id: input.studentId,
    course_id: input.courseId,
    payment_id: input.paymentId,
  });

  // Another request (callback and webhook together) may have won the race.
  if (error && error.code !== "23505") {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

// The one place a payment turns into access. Safe to run twice: the callback
// and the webhook may both call it for the same reference.
export async function fulfilPayment(input: {
  reference: string;
  transaction: VerifiedPayment;
}): Promise<{ ok: true; courseId: string; slug: string | null; already: boolean } | { ok: false; error: string }> {
  const { reference, transaction } = input;

  const payment = await getPaymentByReference(reference);
  if (!payment) {
    return { ok: false, error: "That payment was not found." };
  }

  const course = await getCourseForPayment(payment.course_id);
  if (!course) {
    return { ok: false, error: "That course is no longer available." };
  }

  if (transaction.status !== "success") {
    return { ok: false, error: "Paystack has not marked this payment as paid." };
  }

  if (transaction.reference !== payment.reference) {
    return { ok: false, error: "That payment reference does not match the order." };
  }

  if (transaction.currency !== payment.currency) {
    return { ok: false, error: "That payment used a different currency." };
  }

  if (transaction.amount !== payment.amount_kobo) {
    return { ok: false, error: "The amount paid does not match the order." };
  }

  const admin = createAdminClient();

  const { data: existingEnrolment } = await admin
    .from("enrolments")
    .select("id")
    .eq("student_id", payment.student_id)
    .eq("course_id", payment.course_id)
    .maybeSingle();

  if (payment.status === "success" && existingEnrolment) {
    return {
      ok: true,
      courseId: payment.course_id,
      slug: course.slug,
      already: true,
    };
  }

  const { error: paymentError } = await admin
    .from("payments")
    .update({
      status: "success",
      paystack_reference: transaction.reference,
      channel: transaction.channel ?? null,
      paid_at: transaction.paid_at ?? new Date().toISOString(),
      raw_payload: transaction,
    })
    .eq("id", payment.id);

  if (paymentError) {
    return { ok: false, error: paymentError.message };
  }

  const granted = await grantEnrolment({
    studentId: payment.student_id,
    courseId: payment.course_id,
    paymentId: payment.id,
  });

  if (!granted.ok) {
    return { ok: false, error: granted.error ?? "Could not unlock the course." };
  }

  return {
    ok: true,
    courseId: payment.course_id,
    slug: course.slug,
    already: false,
  };
}

// A free course needs no Paystack call, but it still gets a real payment row so
// the trainer's sales list tells the whole story.
export async function grantFreeEnrolment(input: {
  studentId: string;
  courseId: string;
}): Promise<{ ok: boolean; error?: string }> {
  const admin = createAdminClient();
  const reference = newReference();
  const now = new Date().toISOString();

  const { data: payment, error } = await admin
    .from("payments")
    .insert({
      student_id: input.studentId,
      course_id: input.courseId,
      reference,
      amount_kobo: 0,
      currency: "NGN",
      status: "success",
      channel: "free",
      paid_at: now,
      raw_payload: { source: "free" },
    })
    .select("id")
    .single();

  if (error || !payment) {
    return { ok: false, error: error?.message ?? "Could not enrol you." };
  }

  return grantEnrolment({
    studentId: input.studentId,
    courseId: input.courseId,
    paymentId: payment.id,
  });
}
