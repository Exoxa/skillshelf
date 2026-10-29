import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { env, isSupabaseConfigured } from "@/lib/env";

// Paths that need a signed-in user. Trainer pages also check the role on the
// server itself; this is only the first gate.
const PROTECTED_PREFIXES = ["/trainer", "/my-courses", "/learn", "/checkout"];

export async function proxy(request: NextRequest) {
  // Without keys the app still runs in setup mode.
  if (!isSupabaseConfigured) return NextResponse.next();

  const { pathname, search } = request.nextUrl;

  try {
    let response = NextResponse.next({ request });

    const supabase = createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    });

    // Refreshes the session cookie. Do not remove.
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const needsUser = PROTECTED_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    );

    if (needsUser && !user) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.search = "";
      url.searchParams.set("next", `${pathname}${search}`);
      return NextResponse.redirect(url);
    }

    return response;
  } catch (error) {
    // A temporary Supabase or network problem must not take the whole site
    // down. The real checks live in the pages, not here.
    console.error("proxy: session refresh failed", error);
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    // Everything except static files, images and the health check.
    "/((?!api/health|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4|webm)$).*)",
  ],
};
