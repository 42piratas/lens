# Security policy

We take security seriously. Thank you for taking the time to disclose responsibly.

## Supported versions

LENS is in active development and ships from the `staging` branch (preview / dev) and `main` branch (production). Security fixes land on both. There are no LTS branches and no backports to older tags.

| Branch | Status |
|:--|:--|
| `main` | ✅ Receives security fixes |
| `staging` | ✅ Receives security fixes |
| Older tags | ❌ Not supported |

## Reporting a vulnerability

**Please do not open a public GitHub issue for security problems.** Use GitHub's private vulnerability reporting:

→ **[Open a private security advisory](https://github.com/42piratas/lens/security/advisories/new)**

This keeps the discussion private until a fix ships.

If you can't use GitHub for some reason, email `tisuang@gmail.com` with `[LENS SECURITY]` in the subject line.

## What to include

- A clear description of the issue and its impact.
- Steps to reproduce, or a proof-of-concept if you have one.
- The commit SHA or version you tested against.
- Your suggested fix, if you have one.

## Response expectations

- **Acknowledgement** — within 7 days of your report.
- **Triage** — within 14 days we'll classify severity and confirm whether we accept the issue.
- **Fix** — timeline depends on severity and complexity. We'll keep you updated.
- **Disclosure** — coordinated. We aim to publish an advisory once a fix has shipped to `main`. We're happy to credit you in the advisory unless you prefer to remain anonymous.

## Scope

In scope:

- The LENS application code under `app/` and `infra/`
- Auth flows, OAuth token handling, session management
- Server-side connector clients (data leakage, SSRF, injection)
- Supabase RLS policies and SQL migrations
- CI / build pipeline configuration

Out of scope:

- Vulnerabilities in third-party services LENS connects to (Google, Trello, Trakt, Goodreads, etc.) — report those upstream.
- Issues that require physical access to a user's machine or a compromised account.
- Self-hosting misconfigurations (weak secrets, exposed admin endpoints, missing TLS) — these are operator responsibilities, not LENS bugs.
- Denial of service against the dev server or unauthenticated rate limits on a self-hosted instance.

## Coordinated disclosure

We follow standard coordinated disclosure: we ask reporters to give us a reasonable window to ship a fix before publishing details. If a vulnerability is being actively exploited in the wild, we'll prioritize fixing it and may publish a partial advisory sooner.

Thank you for helping keep LENS and its users safe.
