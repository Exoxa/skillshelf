import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireStudent } from "@/lib/auth";
import {
  fulfilPayment,
  getCourseForPayment,
  getPaymentByReference,
  markPaymentFailed,
} from "@/lib/payments";
import { isPaystackConfigured, verifyTransaction } from "@/lib/paystack";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendWelcomeEmail } from "@/lib/email";

export const metadata: Metadata = { title: "Checking payment" };

type Params = {
  searchParams: Promise<{ reference?: string; trxref?: string }>;
};

function Message({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <main className="flex-1">
      <section className="mx-auto w-full max-w-lg px-5 py-12">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted">
          {children}
        </div>
        <Link
          href="/"
          className="mt-6 inline-flex h-11 items-center rounded-xl bg-brand px-4 text-sm font-medium text-white transition hover:opacity-95"
        >
          All courses
        </Link>
      </section>
    </main>
  );
}

export default async function CheckoutCallbackPage({ searchParams }: Params) {
  const search = await searchParams;
  const reference = (search.reference ?? search.trxref ?? "").trim();

  const returnPath = reference
    ? `/checkout/callback?reference=${encodeURIComponent(reference)}`
    : "/checkout/callback";

  const profile = await requireStudent(returnPath);

  if (!reference) {
    redirect("/");
  }

  const payment = await getPaymentByReference(reference);

  // A student may only confirm her own order. Anything else looks like a
  // missing payment, so a guessed reference tells an attacker nothing.
  if (!payment || payment.student_id !== profile.id) {
    return (
      <Message title="Payment not found">
        <p>
          We could not find that payment on your account. If you were charged,
          send us the receipt and we will sort it out.
        </p>
        <p>
          <Link href="/" className="text-brand hover:underline">
            Go back to the courses
          </Link>
        </p>
      </Message>
    );
  }

  const course = await getCourseForPayment(payment.course_id);
  const coursePath = course ? `/courses/${course.slug}` : "/";

  // Our own records already say this order succeeded (only the server can
  // write that), so show the course even if Paystack is slow right now.
  if (payment.status === "success") {
    redirect(`${coursePath}?paid=1`);
  }

  if (!isPaystackConfigured) {
    return (
      <Message title="Payment not checked">
        <p>Card payment is not connected on this site yet.</p>
      </Message>
    );
  }

  const verified = await verifyTransaction(reference);

  if (verified.error || !verified.data) {
    // Do not mark the order failed: a network blip is not a failed payment.
    return (
      <Message title="We could not confirm the payment yet">
        <p>
          Paystack did not answer, so we have not unlocked anything. If money
          left your account, it will still be credited once the check goes
          through.
        </p>
        <p>
          <Link href={returnPath} className="font-medium text-brand hover:underline">
            Check again
          </Link>
        </p>
        <p>
          <Link href={coursePath} className="text-brand hover:underline">
            Back to the course
          </Link>
        </p>
        <p className="text-xs">
          Your reference: <span className="font-mono">{reference}</span>
        </p>
      </Message>
    );
  }

  const transaction = verified.data;

  async function sendWelcomeOnceLocal(ref: string) {
    const admin = createAdminClient();
    const payment = await getPaymentByReference(ref);
    if (!payment) return;

    const { data: enrolment } = await admin
      .from("enrolments")
      .select("id, welcome_email_sent_at, course_id")
      .eq("payment_id", payment.id)
      .maybeSingle();

    if (!enrolment || enrolment.welcome_email_sent_at) return;

    const course = await getCourseForPayment(enrolment.course_id);
    if (!course) return;

    const { data: profile } = await admin
      .from("profiles")
      .select("email")
      .eq("id", payment.student_id)
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

  if (transaction.status === "success") {
    const result = await fulfilPayment({ reference, transaction });

    if (!result.ok) {
      return (
        <Message title="Payment received, but the course is still locked">
          <p>
            We have your payment but could not open the course just now. Please
            try again — you will not be charged twice.
          </p>
          <p>
            <Link
              href={returnPath}
              className="font-medium text-brand hover:underline"
            >
              Try opening the course again
            </Link>
          </p>
          <p className="text-xs">
            Your reference: <span className="font-mono">{reference}</span>
          </p>
        </Message>
      );
    }

    await sendWelcomeOnceLocal(reference);

    redirect(`${coursePath}?paid=1`);
  }

  if (transaction.status === "failed" || transaction.status === "reversed") {
    await markPaymentFailed(reference, transaction);
    redirect(course ? `/checkout/${course.slug}?payment=failed` : "/");
  }

  // abandoned, ongoing, pending, processing, queued: Paystack has not made up
  // its mind yet. Leave the order open and send the student back.
  redirect(course ? `/checkout/${course.slug}?payment=pending` : "/");
}
