import { NextResponse } from "next/server";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

// Tells us which services are wired up, without exposing a single key.
export function GET() {
  let supabaseHost = "";
  try {
    supabaseHost = env.supabaseUrl ? new URL(env.supabaseUrl).host : "";
  } catch {
    supabaseHost = "invalid-url";
  }

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
      supabaseHost,
      siteUrl: env.siteUrl,
    },
    { headers: { "cache-control": "no-store" } },
  );
}
