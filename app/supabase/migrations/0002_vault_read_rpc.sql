-- LENS b02-15 follow-up: Vault decrypt accessor
--
-- public.vault_read_secret(uuid) → text. Wraps a SELECT on
-- vault.decrypted_secrets so the service-role client can decrypt OAuth
-- tokens via supabase.rpc(...) without having to expose the vault schema
-- to PostgREST. Mirrors the pattern of vault_create_secret /
-- vault_update_secret.

create or replace function public.vault_read_secret(secret_id uuid)
returns text
language plpgsql
security definer
set search_path = public, vault
as $$
  declare
    plaintext text;
  begin
    select decrypted_secret into plaintext
    from vault.decrypted_secrets
    where id = secret_id;
    return plaintext;
  end;
$$;

revoke all on function public.vault_read_secret(uuid) from public;
grant execute on function public.vault_read_secret(uuid) to service_role;

-- Also expose delete via SECURITY DEFINER so we don't need a vault schema
-- exposure for the disconnect path.
create or replace function public.vault_delete_secret(secret_id uuid)
returns void
language plpgsql
security definer
set search_path = public, vault
as $$
  begin
    delete from vault.secrets where id = secret_id;
  end;
$$;

revoke all on function public.vault_delete_secret(uuid) from public;
grant execute on function public.vault_delete_secret(uuid) to service_role;
