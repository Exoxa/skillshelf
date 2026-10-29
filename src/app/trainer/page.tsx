import type { Metadata } from "next";
import { requireTrainer } from "@/lib/auth";

export const metadata: Metadata = { title: "Trainer" };

export default async function TrainerPage() {
  const profile = await requireTrainer("/trainer");

  return (
    <main className="flex-1">
      <section className="mx-auto w-full max-w-3xl px-5 py-12">
        <p className="text-xs font-semibold tracking-wide text-muted uppercase">
          Trainer
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          {profile.full_name ? `Hello, ${profile.full_name}` : "Hello"}
        </h1>
        <p className="mt-2 max-w-xl text-muted">
          This is your private area. Students cannot open it.
        </p>

        <div className="mt-8 rounded-2xl border border-border bg-card p-5">
          <h2 className="text-sm font-medium">Stage 1 is in place</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Accounts, login and the trainer role work. Next, the course and
            lesson forms land here, followed by sales and payments.
          </p>
        </div>
      </section>
    </main>
  );
}
