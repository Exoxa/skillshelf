import { NextResponse } from "next/server";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

// Public key formats: new Supabase keys start with sb_publishable_, older ones
// are JWTs starting with eyJ. Anything else is a paste mistake.
function looksLikeKey(value: string, kind: "publishable" | "secret") {
  if (kind === "publishable") {
    return value.startsWith("sb_publishable_") || value.startsWith("eyJ");
  }
  return value.startsWith("sb_secret_") || value.startsWith("eyJ");
}

// Tells us which services are wired up, without exposing a key. The Supabase
// URL host is public anyway.
export function GET() {
  const rawUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();

  let host = "";
  try {
    host = env.supabaseUrl ? new URL(env.supabaseUrl).host : "";
  } catch {
    host = "";
  }

  const urlLooksRight = /^[a-z0-9-]+\.supabase\.(co|in)$/i.test(host);
  const keysLookRight =
    looksLikeKey(anonKey, "publishable") && looksLikeKey(serviceKey, "secret");

  return NextResponse.json(
    {
      ok: true,
      stage: 5,
      // Which deploy is answering, so a stale build is obvious.
      commit: (process.env.VERCEL_GIT_COMMIT_SHA ?? "local").slice(0, 7),
      environment: process.env.VERCEL_ENV ?? "local",
      // "ready" means every value needed for accounts is present and shaped
      // like a real Supabase value.
      ready: urlLooksRight && keysLookRight,
      services: {
        supabase: Boolean(env.supabaseUrl && anonKey),
        supabaseAdmin: Boolean(serviceKey),
        paystack: Boolean(env.paystackSecretKey),
        // Shape only: true means test keys, false means live keys.
        paystackTestMode: env.paystackSecretKey
          ? env.paystackSecretKey.startsWith("sk_test_")
          : null,
        email: Boolean(env.resendApiKey),
      },
      supabaseHost: host,
      siteUrl: env.siteUrl,
      checks: {
        urlLooksRight,
        anonKeyLooksRight: looksLikeKey(anonKey, "publishable"),
        serviceKeyLooksRight: looksLikeKey(serviceKey, "secret"),
      },
      // Shape of the raw value, so a bad paste is obvious without printing it.
      urlCheck: {
        length: rawUrl.length,
        startsWithHttps: /^https:\/\//i.test(rawUrl),
        containsSpace: /\s/.test(rawUrl),
      },
    },
    { headers: { "cache-control": "no-store" } },
  );
}
