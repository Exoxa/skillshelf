// Environment values are read once. Values pasted from a dashboard often carry
// a trailing slash, a stray newline, surrounding quotes, the REST path, or no
// https:// at the front. Clean them here so one sloppy paste cannot break every
// request.
function clean(value: string | undefined): string {
  return (value ?? "")
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/\s+/g, "")
    .replace(/\/+$/, "")
    .replace(/\/rest\/v1$/i, "")
    .replace(/\/+$/, "");
}

function cleanUrl(value: string | undefined): string {
  const raw = clean(value);
  if (!raw) return "";

  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;

  try {
    new URL(withScheme);
    return withScheme;
  } catch {
    // Leave it empty rather than crash: the app still runs, and /api/health
    // reports the problem.
    return "";
  }
}

export const env = {
  supabaseUrl: cleanUrl(process.env.NEXT_PUBLIC_SUPABASE_URL),
  supabaseAnonKey: (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim(),
  supabaseServiceRoleKey: (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim(),
  paystackSecretKey: (process.env.PAYSTACK_SECRET_KEY ?? "").trim(),
  paystackPublicKey: (process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY ?? "").trim(),
  resendApiKey: (process.env.RESEND_API_KEY ?? "").trim(),
  emailFrom: (process.env.EMAIL_FROM ?? "").trim(),
  // Vercel gives the stable production domain separately from the per-deploy
  // URL, so password reset links do not change every deploy.
  siteUrl:
    cleanUrl(process.env.NEXT_PUBLIC_SITE_URL) ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000"),
};

export const isSupabaseConfigured =
  Boolean(env.supabaseUrl) && Boolean(env.supabaseAnonKey);
