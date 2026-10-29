const nextSteps = [
  {
    title: "Accounts and login",
    body: "Students sign up with an email. The trainer gets one account that unlocks her own area.",
  },
  {
    title: "Courses and lessons",
    body: "The trainer adds her courses, prices and lessons, with video upload.",
  },
  {
    title: "Payment in naira",
    body: "A student pays through Paystack. Access is confirmed on the server, not on the screen.",
  },
  {
    title: "Lessons that stay locked",
    body: "Only a paid student on her own account can open a lesson video.",
  },
];

export default function Home() {
  return (
    <main className="flex-1">
      <section className="mx-auto w-full max-w-3xl px-5 pt-12 pb-10 sm:pt-20">
        <p className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted">
          <span className="size-1.5 rounded-full bg-brand" />
          Stage 1 · accounts
        </p>

        <h1 className="mt-6 text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          Courses from a trainer you trust.
        </h1>

        <p className="mt-4 max-w-xl text-lg leading-relaxed text-muted">
          Pay once in naira, then learn at your own pace on your phone. Lessons
          stay locked until you have paid — and only you can open them.
        </p>
      </section>

      <section className="mx-auto w-full max-w-3xl px-5 pb-16">
        <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <h2 className="text-xs font-semibold tracking-wide text-muted uppercase">
            What gets built next
          </h2>

          <ol className="mt-4 space-y-4">
            {nextSteps.map((step, index) => (
              <li key={step.title} className="flex gap-3">
                <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-brand-soft text-xs font-semibold text-brand">
                  {index + 1}
                </span>
                <div>
                  <p className="text-sm font-medium">{step.title}</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-muted">
                    {step.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <p className="mt-4 text-xs leading-relaxed text-muted">
          This page is a temporary placeholder. The real shop replaces it once
          courses and payments are connected.
        </p>
      </section>
    </main>
  );
}
