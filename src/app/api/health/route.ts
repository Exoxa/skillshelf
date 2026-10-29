import { NextResponse } from "next/server";

// Returns which services are wired up, so we can confirm env vars on Vercel
// without exposing any key values.
export function GET() {
  return NextResponse.json({
    ok: true,
    stage: 0,
    services: {
      supabase: Boolean(
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      ),
      supabaseAdmin: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      paystack: Boolean(process.env.PAYSTACK_SECRET_KEY),
      email: Boolean(process.env.RESEND_API_KEY),
    },
  });
}
