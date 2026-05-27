# Scratchpad connector — *local-connector pattern*

Scratchpad is a **local connector** — its data of record lives in the user's browser (`localStorage['lens.scratchpad']`) for Phase 2, and will move to a Supabase table once multi-user auth (b02-15) lands. The same `useScratchpad()` hook surface stays put across both worlds; only `client.ts` swaps from a localStorage facade to a Supabase facade.

The local-connector pattern is the second variant of the connector contract introduced in `b02-01-02`. The high-level rules:

| Concern         | External connector (Calendar / Trello / Sheets / Keep) | **Local connector (Scratchpad)**                 |
|:----------------|:-------------------------------------------------------|:--------------------------------------------------|
| `auth.ts`       | Reads env vars, returns access tokens / sidecar config | **No-op stub** — `{ envVars: [], setupDoc: 'N/A — local data' }` |
| `client.ts`     | Server-only HTTP client to upstream API                | **Client-only persistence facade** (localStorage / Supabase) |
| Data hook       | `useThing(args)` wrapping React Query over `/api/...`  | **`useScratchpad()`** wrapping `useSyncExternalStore` over the facade |
| Routes          | `/api/keep/*`, `/api/google/*`, `/api/trello/*`        | None — there is no server side                    |
| Manifest        | Identical contract                                     | Identical contract (auth field still required)    |

This entry exists so future connectors of the same shape can opt into the same pattern instead of inventing a third variant.

---

## Tile

| Tile          | Default size | Notes                                                                                |
|:--------------|:-------------|:-------------------------------------------------------------------------------------|
| `note-buffer` | 3×8          | Single editable note bound to one upstream source (Trello card, Calendar event, …).  |

The tile renders a `<textarea>` bound to `state.content`. `TopbarContent` shows `<parentTitle> | <sourceTitle>` while bound, or `Scratchpad` when no source is bound.

---

## Persistence shape (v2 — b02-06)

```ts
type ScratchpadState = {
  version: 2;
  binding: BoundSource | null;
  content: string;
};

type BoundSource = {
  connector: string;          // source connector id (trello / google-calendar / …)
  sourceId: string;            // upstream resource id (Trello card id, Calendar event id, …)
  sourceTitle: string;         // display title at bind time
  parentTitle?: string;        // upstream parent label (Trello list / "CALENDAR" / "SHEETS" / …)
  originalContent: string;     // body loaded from the source at bind time (seed for `content`)
  href?: string;               // optional link to source
  meta?: Record<string, string>; // connector-routing hints (e.g. Calendar's calendarId)
};
```

Mismatched / missing version → start fresh. The v1 → v2 transition wipes the legacy clip-list (dev-only data, acceptable).

---

## Selection clips — `clip-like` round-trip (b02-06)

Scratchpad is the canonical absorber for `clip-like` payloads. The adapter at `payload-adapters/clip-like.ts`:

- `canAccept(_card, payload)` — true for any clip with non-empty `label` + `source.connector` + `source.sourceId`.
- `onAccept(_card, payload)` — calls `setBinding(...)` on the local client. **Single active doc, not a list:** a new clip overwrites any prior binding. `content` is seeded from `payload.originalContent`.
- `onContentEdited` — **not implemented on scratchpad**. The write-back lives on the SOURCE connector (Trello's `payloadAdapters["clip-like"].onContentEdited` PUTs the card desc; Calendar's PATCHes the event description).

Producers (Calendar, Trello, Sheets, Tasks) call `useClips().toggleClip(...)` from row-level click handlers. The hook calls `setBinding` on first click and `clearBinding()` when the same source row is re-clicked. It also exposes `isClipped(connector, sourceId)` so the bound source row renders `data-clipped="true"` (DS tokens `--clipped-bg` / `--clipped-border`).

### Edit + write-back

The `note-buffer` tile renders a textarea bound to `state.content`:

1. `onChange` updates a local `draft` state (no persistence).
2. `onBlur` — if `draft !== content`:
   - calls `updateContent(draft)` → local persistence updates immediately;
   - resolves a live card whose `connector === binding.connector` (so the retry queue can address a real `LayoutCard.id`);
   - if the source connector exposes `payloadAdapters["clip-like"].onContentEdited`, enqueues `{ kind: "clip-edit", cardId, payload: { kind: "clip-like", originalContent: draft, source: { connector, sourceId }, parentTitle, href, meta } }` via `lib/dnd-payloads/pending-writes.ts`.
3. The retry-queue worker (`PluginWorkerBootstrap`) drains `clip-edit` entries and invokes the source connector's `onContentEdited(card, payload)` adapter — Trello PUTs `/api/trello/cards/{id}`, Calendar PATCHes `/api/google/calendar/events`. Permanent 401s register the inline reconnect pill on the affected card chrome.

### Read-only sources

Sheets / Tasks / Goodreads / Trakt **omit** `payloadAdapters["clip-like"]`. The note-buffer detects this via `isWritable(binding.connector)` and renders the textarea `readonly` with a banner: *"Read-only — this source cannot be written from here"*.

---

## Single-writer rule

Only `useClips().toggleClip` (the click-to-bind path), the textarea blur (`updateContent`), and the gear-panel debug action call into `client.ts`. The renderer never writes directly. This avoids the "two stores fighting" failure mode the prototype hit.

---

## Debug

When `NEXT_PUBLIC_LENS_DEBUG=1` is set, the gear panel shows a **Bind sample source** button so the renderer can be verified without a live producer. The flag is checked at build time and the button is removed from production bundles.
