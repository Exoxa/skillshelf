import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex-1">
      <section className="mx-auto w-full max-w-3xl px-5 py-16 text-center sm:py-24">
        <p className="text-xs font-semibold tracking-wide text-muted uppercase">
          Page not found
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
          We could not find that page
        </h1>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted">
          The link may be old, or the course may not be open yet.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex h-12 items-center justify-center rounded-xl bg-brand px-5 text-[15px] font-medium text-white transition hover:opacity-95"
        >
          See the courses
        </Link>
      </section>
    </main>
  );
}
