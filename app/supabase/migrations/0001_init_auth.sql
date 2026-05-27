-- LENS b02-15: multi-user auth + per-user state
--
-- Schema:
--   next_auth.*              — owned by @auth/supabase-adapter (Auth.js core tables)
--   public.users             — app-level user mirror; auth.uid() in RLS = users.id
--   public.oauth_tokens      — per-(user, provider) tokens; access/refresh ENCRYPTED via Vault
--   public.layouts           — singleton per user (workspaces envelope lives client-side; this row stores the active envelope)
--   public.scratchpad        — singleton per user
--   public.pending_writes    — server-drained queue (replaces b02-05 client-side queue)
--
-- RLS policy: auth.uid()::uuid = user_id on every user-keyed row, for select/insert/update/delete.
-- Tokens are encrypted at rest via Supabase Vault; only the server (service role) may read decrypted values.

-- ─────────────────────────────────────────────────────────────────────────────
-- Extensions
-- ─────────────────────────────────────────────────────────────────────────────

create extension if not exists pgcrypto;
create extension if not exists supabase_vault with schema vault;

-- ─────────────────────────────────────────────────────────────────────────────
-- next_auth schema (managed by @auth/supabase-adapter)
-- ─────────────────────────────────────────────────────────────────────────────
-- Reference: https://authjs.dev/getting-started/adapters/supabase

create schema if not exists next_auth;
grant usage on schema next_auth to service_role;
grant all on schema next_auth to postgres;

-- next_auth.uid() — returns the JWT-supplied user id. The adapter signs JWTs
-- with SUPABASE_JWT_SECRET so RLS auth.uid() resolves to the next-auth user id.
create or replace function next_auth.uid() returns uuid
  language sql stable
  as $$
    select coalesce(
      nullif(current_setting('request.jwt.claim.sub', true), ''),
      (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
    )::uuid
  $$;

create table next_auth.users (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text unique,
  "emailVerified" timestamptz,
  image text
);

grant all on table next_auth.users to service_role;

create table next_auth.sessions (
  id uuid primary key default gen_random_uuid(),
  expires timestamptz not null,
  "sessionToken" text unique not null,
  "userId" uuid references next_auth.users(id) on delete cascade
);

grant all on table next_auth.sessions to service_role;

create table next_auth.accounts (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  provider text not null,
  "providerAccountId" text not null,
  refresh_token text,
  access_token text,
  expires_at bigint,
  token_type text,
  scope text,
  id_token text,
  session_state text,
  oauth_token_secret text,
  oauth_token text,
  "userId" uuid references next_auth.users(id) on delete cascade,
  unique (provider, "providerAccountId")
);

grant all on table next_auth.accounts to service_role;

create table next_auth.verification_tokens (
  identifier text not null,
  token text not null,
  expires timestamptz not null,
  primary key (identifier, token)
);

grant all on table next_auth.verification_tokens to service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- public.users — app-level user mirror
-- ─────────────────────────────────────────────────────────────────────────────
-- Mirrored by next-auth's signIn event so RLS on public.* can join cleanly.
-- public.users.id == next_auth.users.id (same uuid).

create table public.users (
  id uuid primary key references next_auth.users(id) on delete cascade,
  email text unique not null,
  name text,
  image text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- public.oauth_tokens — per-user OAuth credential vault
-- ─────────────────────────────────────────────────────────────────────────────
-- Tokens are encrypted with Supabase Vault. Plain columns hold the
-- vault secret name (uuid); server reads via vault.decrypted_secrets view.

create table public.oauth_tokens (
  user_id uuid not null references public.users(id) on delete cascade,
  provider text not null check (provider in ('google', 'trello', 'keep-sidecar')),
  access_token_secret_id uuid not null,
  refresh_token_secret_id uuid,
  expires_at timestamptz,
  scopes text[] not null default '{}',
  updated_at timestamptz not null default now(),
  primary key (user_id, provider)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- public.layouts — singleton per user
-- ─────────────────────────────────────────────────────────────────────────────

create table public.layouts (
  user_id uuid primary key references public.users(id) on delete cascade,
  state jsonb not null default '{"version": 1, "activeId": null, "workspaces": []}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- public.scratchpad — singleton per user
-- ─────────────────────────────────────────────────────────────────────────────

create table public.scratchpad (
  user_id uuid primary key references public.users(id) on delete cascade,
  state jsonb not null default '{"version": 1, "items": []}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- public.pending_writes — server-drained retry queue
-- ─────────────────────────────────────────────────────────────────────────────
-- Replaces the b02-05 localStorage queue. Server worker drains with backoff
-- 1s / 5s / 30s / 5m. Permanent failures (auth) surface as inline pill via
-- last_error. attempt counter caps at 4 (after which last_error is sticky).

create table public.pending_writes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  connector text not null,
  item jsonb not null,
  attempt int not null default 0,
  next_attempt_at timestamptz not null default now(),
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index pending_writes_user_next_attempt_idx
  on public.pending_writes (user_id, next_attempt_at);

-- ─────────────────────────────────────────────────────────────────────────────
-- updated_at trigger (shared across all four public tables)
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.touch_updated_at() returns trigger
  language plpgsql
  as $$
    begin
      new.updated_at := now();
      return new;
    end;
  $$;

create trigger users_touch_updated_at before update on public.users
  for each row execute function public.touch_updated_at();
create trigger oauth_tokens_touch_updated_at before update on public.oauth_tokens
  for each row execute function public.touch_updated_at();
create trigger layouts_touch_updated_at before update on public.layouts
  for each row execute function public.touch_updated_at();
create trigger scratchpad_touch_updated_at before update on public.scratchpad
  for each row execute function public.touch_updated_at();
create trigger pending_writes_touch_updated_at before update on public.pending_writes
  for each row execute function public.touch_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.users enable row level security;
alter table public.oauth_tokens enable row level security;
alter table public.layouts enable row level security;
alter table public.scratchpad enable row level security;
alter table public.pending_writes enable row level security;

-- public.users: caller can see/update only their own row.
create policy users_self_select on public.users
  for select using (next_auth.uid() = id);
create policy users_self_update on public.users
  for update using (next_auth.uid() = id) with check (next_auth.uid() = id);

-- oauth_tokens: full self-access. Plaintext access requires service_role
-- bypass (vault.decrypted_secrets); RLS protects the secret-id mapping.
create policy oauth_tokens_self_all on public.oauth_tokens
  for all using (next_auth.uid() = user_id) with check (next_auth.uid() = user_id);

create policy layouts_self_all on public.layouts
  for all using (next_auth.uid() = user_id) with check (next_auth.uid() = user_id);

create policy scratchpad_self_all on public.scratchpad
  for all using (next_auth.uid() = user_id) with check (next_auth.uid() = user_id);

create policy pending_writes_self_all on public.pending_writes
  for all using (next_auth.uid() = user_id) with check (next_auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Service-role grants (server-only paths)
-- ─────────────────────────────────────────────────────────────────────────────

grant all on table public.users to service_role;
grant all on table public.oauth_tokens to service_role;
grant all on table public.layouts to service_role;
grant all on table public.scratchpad to service_role;
grant all on table public.pending_writes to service_role;

grant usage on schema vault to service_role;
grant select on vault.decrypted_secrets to service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- Vault RPC wrappers (PostgREST-callable)
-- ─────────────────────────────────────────────────────────────────────────────
-- vault.create_secret / update_secret are not exposed via PostgREST by
-- default. Wrap them as SECURITY DEFINER functions in the public schema,
-- callable via supabase.rpc() from the server-only admin client.

create or replace function public.vault_create_secret(
  new_secret text,
  new_name text,
  new_description text default ''
) returns uuid
  language plpgsql
  security definer
  set search_path = public, vault
  as $$
    declare
      secret_id uuid;
    begin
      secret_id := vault.create_secret(new_secret, new_name, new_description);
      return secret_id;
    end;
  $$;

revoke all on function public.vault_create_secret(text, text, text) from public;
grant execute on function public.vault_create_secret(text, text, text) to service_role;

create or replace function public.vault_update_secret(
  secret_id uuid,
  new_secret text
) returns void
  language plpgsql
  security definer
  set search_path = public, vault
  as $$
    begin
      perform vault.update_secret(secret_id, new_secret);
    end;
  $$;

revoke all on function public.vault_update_secret(uuid, text) from public;
grant execute on function public.vault_update_secret(uuid, text) to service_role;
