-- LENS b02-11: pinboard — per-user global second nav bar of external shortcuts
--
-- Mirrors the public.layouts pattern: singleton per user (one row per user_id),
-- envelope kept in a jsonb `state` column, owner-only RLS, service-role grant.
--
-- The Pinboard is intentionally global per user (not per workspace) — see the
-- block's locked decision D1.

create table public.pinboards (
  user_id uuid primary key references public.users(id) on delete cascade,
  state jsonb not null default '{"version": 1, "enabled": false, "pins": []}'::jsonb,
  updated_at timestamptz not null default now()
);

create trigger pinboards_touch_updated_at before update on public.pinboards
  for each row execute function public.touch_updated_at();

alter table public.pinboards enable row level security;

create policy pinboards_self_all on public.pinboards
  for all using (next_auth.uid() = user_id) with check (next_auth.uid() = user_id);

grant all on table public.pinboards to service_role;
