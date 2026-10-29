import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

export type Role = "student" | "trainer";

export type Profile = {
  id: string;
  email: string;
  full_name: string;
  role: Role;
};

export const getProfile = cache(async (): Promise<Profile | null> => {
  // Stage 0: no keys yet, so nobody is signed in.
  if (!isSupabaseConfigured) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("id, email, full_name, role")
    .eq("id", user.id)
    .maybeSingle();

  return (
    data ?? {
      id: user.id,
      email: user.email ?? "",
      full_name: "",
      role: "student" as Role,
    }
  );
});

// Every protected page calls one of these. The check runs on the server.
export async function requireStudent(nextPath: string): Promise<Profile> {
  const profile = await getProfile();
  if (!profile) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }
  return profile;
}

export async function requireTrainer(nextPath: string): Promise<Profile> {
  const profile = await requireStudent(nextPath);
  if (profile.role !== "trainer") {
    redirect("/no-access");
  }
  return profile;
}
