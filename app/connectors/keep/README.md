# Keep connector

Read-only views of Google Keep notes inside LENS cards. Talks to the **official Google Keep REST API v1** (`keep.googleapis.com/v1/notes`).

> **Why service account + DWD instead of user OAuth?** The Keep REST API is documented as an "enterprise" API. The `keep.readonly` scope is **not** in Google's [OAuth 2.0 scopes catalog](https://developers.google.com/identity/protocols/oauth2/scopes) and is **not** selectable on the Google Cloud Console consent screen — Google deliberately does not expose Keep via user-OAuth scope grants. The only documented path is a Workspace admin granting a service account permission to impersonate users via domain-wide delegation (DWD). See the b02-12 block spec for the full rationale.

> **Scope.** v1 ships **read-only**, **single-Workspace** (the one the DWD admin configured). For users in that Workspace, Keep "just works" — no user-side authorization step. For everyone else, the Keep tile is hidden from the connector picker.

---

## Modes

| Mode    | Default size | Notes                                                |
|:--------|:-------------|:-----------------------------------------------------|
| `recent`| 3×8          | Most-recent non-trashed notes (sorted by updateTime desc) |
| `label` | 3×8          | Notes filtered by a single label (picked in config)  |

Label list is harvested from the user's most recent notes (Keep API v1 doesn't expose a labels endpoint).

---

## Operator setup

### 1. Create the service account (one-time)

1. Open the GCP project that owns LENS.
2. **IAM & Admin** → **Service Accounts** → **Create service account**. Give it a name (e.g. `lens-keep`).
3. Skip the role grants (not needed for DWD).
4. After creation: open the SA → **Keys** → **Add key** → **JSON**. Download the file.
5. Note the SA's **OAuth 2 Client ID** (a long number) on the SA details page — you'll need it for DWD.

### 2. Grant domain-wide delegation (one-time, requires Workspace admin)

1. Open [admin.google.com](https://admin.google.com) as a Workspace admin.
2. **Security** → **Access and data control** → **API controls** → **Manage Domain Wide Delegation**.
3. **Add new** → paste the SA's Client ID → set OAuth scopes to `https://www.googleapis.com/auth/keep.readonly`.
4. Authorize.

### 3. Wire LENS

Add to `.env.local` (and Vercel envs for staging + production):

```bash
GOOGLE_KEEP_SA_KEY_JSON={"type":"service_account","project_id":"…","client_email":"lens-keep@…","private_key":"-----BEGIN PRIVATE KEY-----\n…\n-----END PRIVATE KEY-----\n",…}
LENS_KEEP_WORKSPACE_DOMAIN=42labs.io
NEXT_PUBLIC_LENS_KEEP_WORKSPACE_DOMAIN=42labs.io
```

- `GOOGLE_KEEP_SA_KEY_JSON` — full contents of the JSON key file, minified to one line (escape the newlines inside `private_key` as `\n`).
- `LENS_KEEP_WORKSPACE_DOMAIN` (server) and `NEXT_PUBLIC_LENS_KEEP_WORKSPACE_DOMAIN` (client) — the primary Workspace domain the DWD applies to. Must match.

### 4. Add a Keep card

Sign in to LENS with your `@<workspace-domain>` account. In LENS, click **+** → pick **Google Keep** → choose `Recent` or `Label`. No extra consent prompt — the SA handles auth in the background.

---

## Operating notes

- **Cache:** 60 s in-memory per `(userEmail, label)`. SA access tokens are cached per user for ~1 h.
- **Color:** Keep API v1 does **not** expose per-note color. All notes render against the neutral surface; the legacy color palette (`--label-*` tokens) still ships in `globals.css` but isn't driven by v1 data.
- **Pinned / archived:** v1 exposes neither — recent mode returns all non-trashed notes by `updateTime` desc.
- **Web URL:** synthesized as `https://keep.google.com/u/0/#NOTE/<id>` (best-effort).
- **Errors:**
  - 401 from Keep → "Workspace required / SA token rejected" pill.
  - 403 from Keep → "verify DWD includes keep.readonly" pill.
  - 429 → "Rate limit" pill.
- **Out of scope:** writes (label create, note PATCH/append) — v1's write surface is narrow; LENS Keep is read-only.
