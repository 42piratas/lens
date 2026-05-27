import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * Upserts a row into public.users keyed by id (= next_auth.users.id).
 * Called from the next-auth signIn callback so RLS-bound public.* tables
 * have a foreign-key target.
 */
export async function mirrorPublicUser(params: {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
}): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("users").upsert(
    {
      id: params.id,
      email: params.email,
      name: params.name,
      image: params.image,
    },
    { onConflict: "id" },
  );
  if (error) {
    throw new Error(`mirrorPublicUser: ${error.message}`);
  }
}
