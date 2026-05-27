import "server-only";
import { getSupabaseAdmin } from "./admin";

/**
 * Supabase Vault wrappers for OAuth-token encryption at rest.
 *
 * Plain columns in `public.oauth_tokens` store the vault secret id (uuid).
 * Reads decrypt via the `vault.decrypted_secrets` view (service-role only).
 * Writes go through `vault.create_secret` / `vault.update_secret`.
 */

export async function vaultCreateSecret(
  plaintext: string,
  name: string,
  description?: string,
): Promise<string> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.rpc("vault_create_secret", {
    new_secret: plaintext,
    new_name: name,
    new_description: description ?? "",
  });
  if (error) throw new Error(`vault_create_secret: ${error.message}`);
  return data as string;
}

export async function vaultUpdateSecret(
  id: string,
  plaintext: string,
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.rpc("vault_update_secret", {
    secret_id: id,
    new_secret: plaintext,
  });
  if (error) throw new Error(`vault_update_secret: ${error.message}`);
}

export async function vaultReadSecret(id: string): Promise<string | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.rpc("vault_read_secret", { secret_id: id });
  if (error) throw new Error(`vault_read_secret: ${error.message}`);
  return (data as string | null) ?? null;
}

export async function vaultDeleteSecret(id: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.rpc("vault_delete_secret", { secret_id: id });
  if (error) throw new Error(`vault_delete_secret: ${error.message}`);
}
