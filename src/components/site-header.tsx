import Link from "next/link";
import { getProfile } from "@/lib/auth";

export async function SiteHeader() {
  const profile = await getProfile();

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between px-5">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-lg bg-brand text-sm font-semibold text-white">
            S
          </span>
          <span className="text-[15px] font-semibold tracking-tight">
            SkillShelf
          </span>
        </Link>

        <nav className="flex items-center gap-4 text-sm">
          {profile ? (
            <>
              {profile.role === "trainer" ? (
                <Link
                  href="/trainer"
                  className="text-muted transition-colors hover:text-foreground"
                >
                  Dashboard
                </Link>
              ) : null}

              <form action="/auth/signout" method="post">
                <button
                  type="submit"
                  className="text-muted transition-colors hover:text-foreground"
                >
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/login"
              className="font-medium text-brand hover:underline"
            >
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
