-- b02-13: allow 'github' as an oauth_tokens provider.
--
-- GitHub connects as a post-sign-in "connection" (GitHub App + user-to-server
-- token), persisted to public.oauth_tokens like Trello. Only the provider
-- CHECK constraint needs to widen — no new columns: V1 stores just the
-- user-to-server access token; which repos are exposed is managed by the user
-- at github.com/settings/installations and is not mirrored in our schema.

alter table public.oauth_tokens drop constraint if exists oauth_tokens_provider_check;

alter table public.oauth_tokens
  add constraint oauth_tokens_provider_check
  check (provider in ('google', 'trello', 'keep-sidecar', 'github'));
