import "server-only";
import { auth } from "@/auth";
import { getSupabaseForUser } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-side helper for route handlers: returns the current user's id +
 * an RLS-bound Supabase client, or null when the request is unauthenticated.
 * Caller is responsible for returning a 401 in that case.
 */
export async function getRouteSession(): Promise<{
  userId: string;
  supabase: SupabaseClient;
} | null> {
  const session = (await auth()) as
    | { user: { id?: string }; supabaseAccessToken?: string }
    | null;
  if (!session?.user?.id || !session.supabaseAccessToken) return null;
  return {
    userId: session.user.id,
    supabase: getSupabaseForUser(session.supabaseAccessToken),
  };
}
