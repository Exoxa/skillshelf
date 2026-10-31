import type { Metadata } from "next";
import Link from "next/link";
import { requireTrainer } from "@/lib/auth";
import { describePrice } from "@/lib/courses";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Payments & students" };

function formatDate(value: string | null) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("en-NG");
  } catch {
    return value;
  }
}

export default async function TrainerPaymentsPage() {
  await requireTrainer("/trainer/payments");
  const admin = createAdminClient();

  const [{ data: payments }, { data: enrolments }] = await Promise.all([
    admin
      .from("payments")
      .select(
        "id, reference, paystack_reference, amount_kobo, currency, status, channel, paid_at, created_at, student_id, course_id",
      )
      .order("created_at", { ascending: false })
      .limit(200),
    admin
      .from("enrolments")
      .select("id, student_id, course_id, created_at")
      .order("created_at", { ascending: false }),
  ]);

  const studentIds = [
    ...new Set(
      [...(payments ?? []), ...(enrolments ?? [])].map((row) =>
        row.student_id,
      ),
    ),
  ];
  const courseIds = [
    ...new Set(
      [...(payments ?? []), ...(enrolments ?? [])].map((row) =>
        row.course_id,
      ),
    ),
  ];

  const [{ data: profiles }, { data: courses }] = await Promise.all([
    studentIds.length
      ? admin.from("profiles").select("id, email").in("id", studentIds)
      : Promise.resolve({ data: [] }),
    courseIds.length
      ? admin
          .from("courses")
          .select("id, title, slug")
          .in("id", courseIds)
      : Promise.resolve({ data: [] }),
  ]);

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p.email]));
  const courseMap = new Map((courses ?? []).map((c) => [c.id, c]));

  const enrolmentsByCourse = new Map<string, typeof enrolments>();
  for (const e of enrolments ?? []) {
    const list = enrolmentsByCourse.get(e.course_id) ?? [];
    list.push(e);
    enrolmentsByCourse.set(e.course_id, list);
  }

  return (
    <main className="flex-1">
      <section className="mx-auto w-full max-w-5xl px-5 py-10">
        <Link
          href="/trainer"
          className="text-sm text-muted transition-colors hover:text-foreground"
        >
          ← Back to your courses
        </Link>

        <h1 className="mt-4 text-2xl font-semibold tracking-tight">
          Payments & students
        </h1>
        <p className="mt-2 text-sm text-muted">
          See who paid for what. Refunds stay manual in Paystack; removing
          access is done by deleting the enrolment row.
        </p>

        <section className="mt-8">
          <h2 className="text-sm font-semibold">Payments</h2>
          <div className="mt-3 overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted">
                  <th className="px-4 py-2.5 font-medium">Date</th>
                  <th className="px-4 py-2.5 font-medium">Student</th>
                  <th className="px-4 py-2.5 font-medium">Course</th>
                  <th className="px-4 py-2.5 font-medium">Amount</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium">Reference</th>
                  <th className="px-4 py-2.5 font-medium">Channel</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(payments ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-4 text-center text-muted">
                      No payments yet.
                    </td>
                  </tr>
                ) : (
                  (payments ?? []).map((payment) => {
                    const course = courseMap.get(payment.course_id);
                    return (
                      <tr key={payment.id}>
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          {formatDate(payment.paid_at ?? payment.created_at)}
                        </td>
                        <td className="px-4 py-2.5">
                          {profileMap.get(payment.student_id) ?? "—"}
                        </td>
                        <td className="px-4 py-2.5">
                          {course ? course.title : "—"}
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          {describePrice(payment.amount_kobo)}
                        </td>
                        <td className="px-4 py-2.5">
                          <span
                            className={
                              payment.status === "success"
                                ? "rounded-full bg-brand-soft px-2 py-0.5 text-xs text-brand"
                                : payment.status === "pending"
                                  ? "rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-900"
                                  : "rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-800"
                            }
                          >
                            {payment.status}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 font-mono text-xs">
                          {payment.paystack_reference || payment.reference}
                        </td>
                        <td className="px-4 py-2.5">
                          {payment.channel || "—"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-sm font-semibold">Students per course</h2>
          <div className="mt-3 space-y-4">
            {(courses ?? []).length === 0 ? (
              <p className="text-sm text-muted">No courses yet.</p>
            ) : (
              (courses ?? []).map((course) => {
                const list = enrolmentsByCourse.get(course.id) ?? [];
                return (
                  <div
                    key={course.id}
                    className="rounded-2xl border border-border bg-card"
                  >
                    <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                      <p className="font-medium">{course.title}</p>
                      <p className="text-xs text-muted">
                        {list.length === 1
                          ? "1 student"
                          : `${list.length} students`}
                      </p>
                    </div>
                    <div className="divide-y divide-border">
                      {list.length === 0 ? (
                        <p className="px-4 py-3 text-sm text-muted">
                          No one has bought this yet.
                        </p>
                      ) : (
                        list.map((enrolment) => (
                          <div
                            key={enrolment.id}
                            className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
                          >
                            <p>
                              {profileMap.get(enrolment.student_id) ?? "—"}
                            </p>
                            <p className="text-xs text-muted">
                              Enrolled {formatDate(enrolment.created_at)}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
