// Environment values are read once. Values pasted from a dashboard often carry
// a trailing slash, a stray newline, surrounding quotes, or the REST path.
// Clean them here so one sloppy paste cannot break every request.
function clean(value: string | undefined): string {
  return (value ?? "")
    .trim()
    .replace(/^["']|["']$/g, "")
    .trim()
    .replace(/\/+$/, "")
    .replace(/\/rest\/v1$/i, "")
    .replace(/\/+$/, "");
}

export const env = {
  supabaseUrl: clean(process.env.NEXT_PUBLIC_SUPABASE_URL),
  supabaseAnonKey: (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim(),
  supabaseServiceRoleKey: (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim(),
  paystackSecretKey: (process.env.PAYSTACK_SECRET_KEY ?? "").trim(),
  paystackPublicKey: (process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY ?? "").trim(),
  resendApiKey: (process.env.RESEND_API_KEY ?? "").trim(),
  emailFrom: (process.env.EMAIL_FROM ?? "").trim(),
  siteUrl:
    clean(process.env.NEXT_PUBLIC_SITE_URL) ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000"),
};

export const isSupabaseConfigured =
  Boolean(env.supabaseUrl) && Boolean(env.supabaseAnonKey);
