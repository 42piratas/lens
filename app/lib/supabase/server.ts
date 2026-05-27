import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * RLS-respecting client. The supplied accessToken is the per-user JWT signed
 * with SUPABASE_JWT_SECRET (from next-auth's session callback). All reads /
 * writes go through RLS, so this client cannot escape the user's row scope.
 */
export function getSupabaseForUser(accessToken: string): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Supabase client misconfigured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.",
    );
  }
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}
