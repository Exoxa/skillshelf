import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireStudent } from "@/lib/auth";
import { hasCourseAccess } from "@/lib/access";
import { describePrice, getCourseBySlug } from "@/lib/courses";
import { paystackMode } from "@/lib/paystack";
import { Alert, SubmitButton } from "@/components/form";
import { startCheckout } from "../actions";

export const metadata: Metadata = { title: "Buy course" };

type Params = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ error?: string; payment?: string }>;
};

const ERROR_MESSAGES: Record<string, string> = {
  setup: "Card payment is not open yet. Please check back soon — nothing has been charged.",
  start:
    "We could not start the payment. Nothing was charged. Please try again in a moment.",
  free: "We could not open the course just now. Please try again.",
};

const PAYMENT_MESSAGES: Record<string, string> = {
  failed:
    "That payment did not go through, so the course is still locked. Nothing was charged. You can try again below.",
  pending:
    "Paystack has not confirmed the payment yet. If you finished paying, wait a moment and check the course page.",
};

export default async function CheckoutPage({ params, searchParams }: Params) {
  const { slug } = await params;
  const search = await searchParams;

  const profile = await requireStudent(`/checkout/${slug}`);
  const course = await getCourseBySlug(slug);
  if (!course || !course.is_published) notFound();

  if (profile.role === "trainer") redirect(`/courses/${course.slug}`);

  if (await hasCourseAccess(profile, course.id)) {
    redirect(`/courses/${course.slug}?paid=1`);
  }

  const lessonCount = course.lessons.filter(
    (lesson) => lesson.is_published,
  ).length;

  const isFree = course.price_kobo === 0;
  const ready = isFree || paystackMode !== "off";
  const errorMessage = search.error ? ERROR_MESSAGES[search.error] : null;
  const paymentMessage = search.payment
    ? PAYMENT_MESSAGES[search.payment]
    : null;

  return (
    <main className="flex-1">
      <section className="mx-auto w-full max-w-lg px-5 py-10">
        <Link
          href={`/courses/${course.slug}`}
          className="text-sm text-muted transition-colors hover:text-foreground"
        >
          ← Back to {course.title}
        </Link>

        <h1 className="mt-4 text-2xl font-semibold tracking-tight">
          {isFree ? "Get this course" : "Buy this course"}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          One payment. Then the lessons stay open in your account.
        </p>

        <div className="mt-6 rounded-2xl border border-border bg-card p-5">
          <p className="text-lg leading-snug font-semibold">{course.title}</p>
          {course.short_description ? (
            <p className="mt-1 text-sm leading-relaxed text-muted">
              {course.short_description}
            </p>
          ) : null}

          <dl className="mt-5 space-y-3 border-t border-border pt-4 text-sm">
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-muted">Lessons</dt>
              <dd className="font-medium">
                {lessonCount === 1 ? "1 lesson" : `${lessonCount} lessons`}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-muted">Access</dt>
              <dd className="font-medium">Lifetime</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 border-t border-border pt-3">
              <dt className="font-medium">Total</dt>
              <dd className="text-xl font-semibold tracking-tight">
                {describePrice(course.price_kobo)}
              </dd>
            </div>
          </dl>
        </div>

        {errorMessage ? (
          <div className="mt-5">
            <Alert>{errorMessage}</Alert>
          </div>
        ) : null}

        {paymentMessage ? (
          <div className="mt-5">
            <Alert tone="info">{paymentMessage}</Alert>
          </div>
        ) : null}

        {ready ? (
          <form action={startCheckout} className="mt-6 space-y-3">
            <input type="hidden" name="slug" value={course.slug} />
            <SubmitButton
              pendingLabel={
                isFree ? "Opening the course…" : "Taking you to Paystack…"
              }
            >
              {isFree
                ? "Get this course free"
                : `Pay ${describePrice(course.price_kobo)}`}
            </SubmitButton>
          </form>
        ) : (
          <div className="mt-6">
            <p className="rounded-xl border border-border bg-card px-3.5 py-3 text-sm text-muted">
              Card payment is not open yet. Check back soon — nothing has been
              charged.
            </p>
          </div>
        )}

        <p className="mt-4 text-center text-xs leading-relaxed text-muted">
          {isFree
            ? "Free courses open straight away."
            : "You will pay on Paystack's secure page. We never see or store your card details."}
        </p>

        {paystackMode === "test" ? (
          <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-center text-xs leading-relaxed text-amber-900">
            Test mode. Use a Paystack test card — no real money moves.
          </p>
        ) : null}

        <Link
          href={`/courses/${course.slug}`}
          className="mt-4 flex h-12 w-full items-center justify-center rounded-xl px-4 text-sm font-medium text-muted transition-colors hover:bg-card"
        >
          Not now
        </Link>
      </section>
    </main>
  );
}
