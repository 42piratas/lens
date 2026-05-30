import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  vaultCreateSecret,
  vaultUpdateSecret,
  vaultDeleteSecret,
  vaultReadSecret,
} from "@/lib/supabase/vault";

type Provider = "google" | "trello" | "github";

type ExistingTokenRow = {
  access_token_secret_id: string;
  refresh_token_secret_id: string | null;
};

/**
 * Persists a freshly-issued OAuth bundle into public.oauth_tokens.
 *
 * Tokens are encrypted via Supabase Vault. Plain-text columns store the
 * vault secret ids only; reads go through `decryptOAuthToken`. Idempotent:
 * if a row exists for (user, provider), updates the existing vault secrets
 * in place rather than rotating their ids.
 */
export async function persistOAuthTokens(params: {
  userId: string;
  provider: Provider;
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
  scopes: string[];
}): Promise<void> {
  if (!params.accessToken) return;
  const supabase = getSupabaseAdmin();

  const { data: existing, error: selectErr } = await supabase
    .from("oauth_tokens")
    .select("access_token_secret_id, refresh_token_secret_id")
    .eq("user_id", params.userId)
    .eq("provider", params.provider)
    .maybeSingle<ExistingTokenRow>();
  if (selectErr) throw new Error(`persistOAuthTokens select: ${selectErr.message}`);

  const accessSecretName = `oauth.${params.provider}.access.${params.userId}`;
  const refreshSecretName = `oauth.${params.provider}.refresh.${params.userId}`;

  let accessId: string;
  if (existing?.access_token_secret_id) {
    accessId = existing.access_token_secret_id;
    await vaultUpdateSecret(accessId, params.accessToken);
  } else {
    accessId = await vaultCreateSecret(params.accessToken, accessSecretName);
  }

  let refreshId: string | null = existing?.refresh_token_secret_id ?? null;
  if (params.refreshToken) {
    if (refreshId) {
      await vaultUpdateSecret(refreshId, params.refreshToken);
    } else {
      refreshId = await vaultCreateSecret(params.refreshToken, refreshSecretName);
    }
  }

  const expiresAtIso = params.expiresAt ? new Date(params.expiresAt * 1000).toISOString() : null;

  const { error: upsertErr } = await supabase.from("oauth_tokens").upsert(
    {
      user_id: params.userId,
      provider: params.provider,
      access_token_secret_id: accessId,
      refresh_token_secret_id: refreshId,
      expires_at: expiresAtIso,
      scopes: params.scopes,
    },
    { onConflict: "user_id,provider" },
  );
  if (upsertErr) throw new Error(`persistOAuthTokens upsert: ${upsertErr.message}`);
}

/**
 * Reads (and decrypts) the OAuth bundle for (user, provider). Server-only.
 * Returns null when the row is absent or the vault secret has been removed.
 */
export async function readOAuthTokens(params: {
  userId: string;
  provider: Provider;
}): Promise<{
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date | null;
  scopes: string[];
} | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("oauth_tokens")
    .select("access_token_secret_id, refresh_token_secret_id, expires_at, scopes")
    .eq("user_id", params.userId)
    .eq("provider", params.provider)
    .maybeSingle();
  if (error) throw new Error(`readOAuthTokens: ${error.message}`);
  if (!data) return null;

  const accessToken = await vaultReadSecret(data.access_token_secret_id as string);
  if (!accessToken) return null;
  const refreshToken = data.refresh_token_secret_id
    ? await vaultReadSecret(data.refresh_token_secret_id as string)
    : null;
  return {
    accessToken,
    refreshToken,
    expiresAt: data.expires_at ? new Date(data.expires_at as string) : null,
    scopes: (data.scopes as string[] | null) ?? [],
  };
}

/** Updates only the access token + expiry (post-refresh). */
export async function updateAccessToken(params: {
  userId: string;
  provider: Provider;
  accessToken: string;
  expiresAt: Date;
}): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { data, error: selectErr } = await supabase
    .from("oauth_tokens")
    .select("access_token_secret_id")
    .eq("user_id", params.userId)
    .eq("provider", params.provider)
    .single<{ access_token_secret_id: string }>();
  if (selectErr) throw new Error(`updateAccessToken select: ${selectErr.message}`);
  await vaultUpdateSecret(data.access_token_secret_id, params.accessToken);
  const { error: updateErr } = await supabase
    .from("oauth_tokens")
    .update({ expires_at: params.expiresAt.toISOString() })
    .eq("user_id", params.userId)
    .eq("provider", params.provider);
  if (updateErr) throw new Error(`updateAccessToken update: ${updateErr.message}`);
}

/** Deletes a provider connection (used by /settings reconnect flow). */
export async function deleteOAuthTokens(params: {
  userId: string;
  provider: Provider;
}): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { data, error: selectErr } = await supabase
    .from("oauth_tokens")
    .select("access_token_secret_id, refresh_token_secret_id")
    .eq("user_id", params.userId)
    .eq("provider", params.provider)
    .maybeSingle<ExistingTokenRow>();
  if (selectErr) throw new Error(`deleteOAuthTokens select: ${selectErr.message}`);
  if (!data) return;
  await vaultDeleteSecret(data.access_token_secret_id);
  if (data.refresh_token_secret_id) await vaultDeleteSecret(data.refresh_token_secret_id);
  const { error: deleteErr } = await supabase
    .from("oauth_tokens")
    .delete()
    .eq("user_id", params.userId)
    .eq("provider", params.provider);
  if (deleteErr) throw new Error(`deleteOAuthTokens: ${deleteErr.message}`);
}
