# Trello connector

Trello views (List / Board / Due) plus cross-tile label drops (b02-05 Plugins) backed by a single-user API key + token in `.env.local`. Multi-user sign-in lands later in Phase 2 (b02-15 Auth). The token requires `read,write` scope from b02-05 onward — read-only tokens reject `POST /labels`.

## Required env vars

Set in `.env.local` at the repo root (never commit):

```
TRELLO_API_KEY=...
TRELLO_API_TOKEN=...
```

The dev server reads these at runtime via `process.env`. Missing either one throws an `IntegrationError("auth")` and the cards render the "Sign-in expired" pill.

## One-time operator setup

Trello no longer issues API keys from a generic dashboard — every key is tied to an **App** (the entity formerly called "Power-Up" in the docs; the admin UI now labels it "App"). Create one App per LENS install to host the API key:

1. Go to <https://trello.com/power-ups/admin> signed in as the account whose data should appear in LENS. Click **New**.
2. Fill the form:
   - **Name:** `LENS`
   - **Workspace:** any
   - **Iframe connector URL:** `https://example.com` — required field, never actually loaded (we never install this App on a board)
   - **Allowed Origins:** `http://localhost:3000` for dev. Add the production URL when it exists.
3. Save → open the new App. Trello shows an **API Key** and an **API Secret**.
   - Copy **API Key** → `TRELLO_API_KEY` in `.env.local`.
   - **Ignore the Secret.** It's only used by the full OAuth 1.0a 3-leg flow; this connector uses the simpler personal-token flow.
4. Generate a user token by visiting (substitute your key):

   ```
   https://trello.com/1/authorize?expiration=never&scope=read,write&response_type=token&name=LENS&key=YOUR_API_KEY
   ```

   - **Scope: `read,write`** is required from b02-05 (Plugins) onward — write is needed for label drops, scratchpad-comment write-back (b02-06), and any future round-trip flows. Read-only tokens reject `POST /labels` with 401 and surface the inline reconnect pill.
   - **Expiration: never** keeps it stable; revoke anytime at <https://trello.com/my/account> → *Power-Ups*.
5. Click **Allow**. Copy the token shown on the redirect page → paste as `TRELLO_API_TOKEN` in `.env.local`.
6. The dev server picks up `.env.local` on the next request — no restart needed.

### Re-issuing the token to upgrade scope

If you previously issued a `read` token and want to upgrade to `read,write`:

1. Visit <https://trello.com/my/account> → *Power-Ups* → revoke the existing LENS token.
2. Re-run step 4 above with the `read,write` URL. The new token replaces the old `TRELLO_API_TOKEN` value in `.env.local`.

Test the new token end-to-end by dragging a Sheets `badges-with-descriptions` row onto a Trello `kanban-board` tile — the label should appear on the board within a couple of seconds (verify on `trello.com`).

## Module layout

```
connectors/trello/
├─ manifest.tsx          # registry entry: 3 tiles, env-vars, ConfigBody, payloadAdapters
├─ auth.ts               # server-only env reader + trelloFetch + trelloPost + trelloPut
├─ client.ts             # server-only listBoards / listLists / listCards / listBoardLabels / ensureBoardLabel / updateCard
├─ types.ts              # TrelloBoard, TrelloList, NormalizedTrelloCard (incl. desc), IntegrationError
├─ config.tsx            # ConfigBody — board picker + per-mode options
├─ payload-adapters/
│  ├─ tag-like.ts        # tag-like → ensureBoardLabel via /api/trello/labels POST
│  └─ clip-like.ts       # clip-like round-trip → PUT /api/trello/cards/<id> with new desc
├─ hooks/
│  ├─ use-boards.ts      # @tanstack/react-query → /api/trello/boards
│  ├─ use-lists.ts       # …/lists?boardId
│  └─ use-cards.ts       # …/cards?boardId&listIds&dueWithinDays
├─ tiles/
│  ├─ task-list.tsx      # shared task-list adapter
│  └─ task-due.tsx       # shared task-due adapter
├─ _shared/
│  └─ card-item.tsx      # shared TrelloCardItem
└─ __tests__/            # client + utils
```

The four route handlers at `app/api/trello/{boards,lists,cards,labels}/route.ts` wrap the server-only client so the client-side hooks and payload adapters never touch the server module directly.

## Plugins — `tag-like` payload acceptor

The Trello connector accepts cross-tile `tag-like` payloads (b02-05). Drag a row from a Sheets `badges-with-descriptions` tile (or any `tag-like` producer) onto a Trello tile (`kanban-board`, `task-list`, `task-due`) bound to a board, and the adapter idempotently ensures a Trello label with that name exists on the board:

- **Lookup** — `GET /1/boards/{boardId}/labels` and case-insensitive name match. If a label exists, the operation is a no-op.
- **Create** — otherwise `POST /1/labels` with `idBoard` + `name` + `color`. The payload's `color` (a `--label-*` semantic name) maps to Trello's fixed palette; unmapped values default to no color.
- **Out of scope (v1)** — applying the new label to a *specific* Trello card row inside the tile. v1 ships board-level only; the operator adds the label to cards via Trello UI. Per-row drop is forward work.

The adapter routes through the optimistic-write retry queue (`lib/dnd-payloads/pending-writes.ts`) — the UI returns immediately, the worker drains with backoff (1s / 5s / 30s / 5m), permanent 401s surface the inline reconnect pill on the affected card chrome.

## Selection clips — `clip-like` round-trip (b02-06)

Trello cards are whole-card click targets (`<button>` wrappers; entire surface, not just the title row). Clicking a card in `kanban-board` / `task-list` / `task-due` toggles the binding in the scratchpad — the scratchpad's `note-buffer` tile loads the card's `desc` into a `<textarea>`. Editing the textarea + blurring writes the new content back through Trello's `payloadAdapters["clip-like"].onContentEdited`:

- Adapter PUTs `/api/trello/cards/<sourceId>` with `{ desc: <new content> }`.
- The route handler at `app/api/trello/cards/[cardId]/route.ts` calls `updateCard({ cardId, desc })` (which uses Trello's `PUT /1/cards/{id}` with `desc`).
- The same `read,write` scope provisioned for `tag-like` covers the write — no additional rotation.
- Permanent 401s surface the inline reconnect pill on the affected card chrome (same primitive as `tag-like`); manual retry drains the queue.

The adapter routes through the optimistic-write retry queue (`lib/dnd-payloads/pending-writes.ts` — kind `"clip-edit"`) so the UI returns immediately and the worker drains with backoff.

`canAccept` always returns `false` for `clip-like` — Trello is the source for clips, not the absorber (scratchpad is the only absorber). `onAccept` rejects with a friendly reason; only `onContentEdited` carries real semantics.

The b02-06 redesign dropped the original clip-list / deselect-comment flow (the legacy `onSourceRemoved` hook + `/api/trello/cards/<id>/comments` route + trailing `\n\n— scratchpad` marker) in favor of single-binding round-trip semantics.

## Limits

- 60-second in-memory cache on each of `listBoards`, `listLists`, and `listCards`.
- `listCards` filters to `closed: false` open lists only and uses Trello's `filter=open` — archived cards are not returned.
- `listCards` calls `/boards/:id/cards` once per (board, list-set, due-window) cache key — large boards (>1000 cards) may be slow on the first uncached call.
- All three modes silently render the empty state when no board (or no list, for `list` mode) is picked.
- Trello label colors are mapped to the 42labs DS palette — the raw Trello hex is never passed to the DOM.
