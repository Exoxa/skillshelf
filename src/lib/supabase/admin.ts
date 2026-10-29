import "server-only";

import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

// Master key. Bypasses every database rule, so it must only ever be used in
// server code that has already checked who is asking.
export function createAdminClient() {
  if (!env.supabaseServiceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  }

  return createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
