# Infrastructure Playbook — LENS

Operational guide for infrastructure, secrets, and services. Keep this current.

---

## 1. Supabase

### Projects

| Environment | Project | URL |
|-------------|---------|-----|
| Production (v1) | single Supabase project | see `NEXT_PUBLIC_SUPABASE_URL` in `.env.local` / Vercel env |

For v1 / single-user, one Supabase project serves both the `main` branch (= production deploy) and any preview deploys. A separate `lens-prod` project will be split out when traffic / multi-tenant load arrives.

### Migrations

Live in `app/supabase/migrations/`. Applied via `supabase db push` locally, or via the `supabase-db.yml` CI workflow.

Because v1 runs a single Supabase project, migrations are gated to avoid feature-branch drafts hitting production:

- **`pull_request`** → lint only (no `db push`)
- **`push` to `main`** (post-merge) → lint + apply
- **`workflow_dispatch`** → manual apply (set input `apply=true` for emergency / out-of-band runs)

When a separate `lens-prod` project is split out, point `main`-branch CI at `lens-staging` and gate the `lens-prod` apply on a release tag or manual dispatch.

### RLS

Row Level Security is enabled on every user-keyed table — landed end-to-end in b02-15 with `next_auth.uid() = user_id` policies on `oauth_tokens`, `layouts`, `scratchpad`, `pending_writes` (plus `users_self_select`/`users_self_update` on `public.users`). Empirical two-account probe at `app/scripts/probe-rls-cross-user.mjs` (run during b02-15 close) confirms cross-user reads return 0 rows and forged-`user_id` INSERTs are blocked at the DB with Postgres `42501`. Vault wrappers (`vault_create/update/read/delete_secret`, all SECURITY DEFINER) own token encryption — vault schema is intentionally NOT exposed via PostgREST; access is service-role-only.

### Secret Rotation

| Secret | Rotation frequency | Location |
|--------|-------------------|----------|
| `SUPABASE_SERVICE_ROLE_KEY` | On team change | Vercel env per env + `.env.local` |
| `SUPABASE_JWT_SECRET` | On breach | Supabase dashboard → JWT Settings |

---

## 2. Vercel

Default deployment target. Vercel chosen for its first-class Next.js integration, preview deploys per PR, and zero-config edge runtime.

### Environments

| Surface | URL | Source |
|---------|-----|--------|
| Production | `https://<your-prod-domain>` | `main` branch (Production Branch in Vercel) |
| Per-PR Preview | `https://lens-<hash>-<your-team>.vercel.app` | Feature branches |

### Environment variables

Managed via Vercel dashboard → Project → Settings → Environment Variables.

Required vars are documented in [`app/.env.example`](../app/.env.example).

---

## 3. Railway / LiteLLM

### Deployment

- Project: `lens-litellm` on Railway
- Config: `infra/litellm_config.yaml`
- Entrypoint: `infra/litellm-entrypoint.sh` (drops conflicting Prisma view on cold start)
- Image: `docker.litellm.ai/berriai/litellm:main-v1.63.14-stable` — **pinned**, do NOT update without testing

### Spend Dashboard

- URL: `<railway_url>/ui`
- Credentials: `LITELLM_UI_USERNAME` / `LITELLM_UI_PASSWORD` (Railway env vars)
- Per-user monthly cap configured in `litellm_config.yaml` via `max_user_budget` + `user_budget_duration: monthly`

### Secret Rotation

Rotate `LITELLM_MASTER_KEY`:
1. Generate new key
2. Update Railway env `LITELLM_MASTER_KEY`
3. Update Vercel env `LITELLM_API_KEY` (same value, all scopes)
4. Redeploy Railway service

---

## 4. Google Chat Notifications

Substituted for Slack in LENS's profile — Google Chat is the team notification channel.

### Spaces

| Space | Webhook env var | Source |
|:--|:--|:--|
| `lens-deploys` | `GCHAT_WEBHOOK_DEPLOYS` | Vercel + Railway deploy events (via translator function) |
| `lens-infra` | `GCHAT_WEBHOOK_INFRA` | Infra health (LiteLLM, Supabase) |

### Translator functions

Vercel and Railway send their own webhook shapes; Google Chat expects its own. Thin Vercel Functions translate:

- `app/app/api/webhooks/vercel-deploy/route.ts` — receives Vercel webhook, posts to `GCHAT_WEBHOOK_DEPLOYS`
- `app/app/api/webhooks/railway-deploy/route.ts` — receives Railway webhook, posts to `GCHAT_WEBHOOK_DEPLOYS`

Document URLs of the registered webhooks (in Vercel/Railway settings) here once provisioned.

### Webhook rotation

Google Chat webhooks rotate by deleting the webhook in the space and recreating it; update the env var and the source-side webhook URL.

---

## 5. Secrets Reference

| Secret | Where | Rotation |
|--------|-------|---------|
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel per env + `.env.local` | On team change |
| `SUPABASE_JWT_SECRET` | Vercel per env + `.env.local` | On breach |
| `LITELLM_MASTER_KEY` | Railway (also as `LITELLM_API_KEY` in Vercel) | Annually |
| `AUTH_SECRET` (Auth.js v5) | Vercel per env + `.env.local` | Annually |
| `GOOGLE_OAUTH_CLIENT_SECRET` | Vercel per env + `.env.local` | Annually |
| `TRELLO_API_KEY` (public-ish app key, not a secret per se but env-managed) | Vercel per env + `.env.local` | Rarely (when re-issuing the Trello app) |
| `GCHAT_WEBHOOK_*` | Vercel production | On webhook recreation |
| `GITHUB_PAT` | `~/.zshrc` (agent-side) | Every 90 days |
| `SUPABASE_ACCESS_TOKEN` | `~/.zshrc` (agent-side) | Every 90 days |
