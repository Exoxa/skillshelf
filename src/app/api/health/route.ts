import { NextResponse } from "next/server";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

// Tells us which services are wired up, without exposing a single key. Only the
// host of the Supabase URL is shown (it is public anyway).
export function GET() {
  const rawUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();

  return NextResponse.json(
    {
      ok: true,
      stage: 1,
      services: {
        supabase: Boolean(env.supabaseUrl && env.supabaseAnonKey),
        supabaseAdmin: Boolean(env.supabaseServiceRoleKey),
        paystack: Boolean(env.paystackSecretKey),
        email: Boolean(env.resendApiKey),
      },
      supabaseHost: env.supabaseUrl ? new URL(env.supabaseUrl).host : "",
      siteUrl: env.siteUrl,
      // Shape of the raw value, so a bad paste is obvious without printing it.
      urlCheck: {
        length: rawUrl.length,
        startsWithHttps: /^https:\/\//i.test(rawUrl),
        endsWithSlash: rawUrl.endsWith("/"),
        containsSpace: /\s/.test(rawUrl),
        accepted: Boolean(env.supabaseUrl),
      },
    },
    { headers: { "cache-control": "no-store" } },
  );
}
