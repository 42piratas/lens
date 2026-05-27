# Plugins — cross-tile drag-payload registry

The 5th modular surface in LENS. Connectors, tiles, themes, and workspaces
cover *what data shows up where*. Plugins cover *how data crosses tile
boundaries* — drag from a producer tile, drop onto a foreign connector's
tile, the foreign connector absorbs the payload into its native model.

## Contract at a glance

A typed `DragPayload` discriminated union travels via the HTML5 drag MIME
`application/x-lens-payload`. Connectors opt in by declaring
`payloadAdapters` on their manifest. Each adapter exposes:

```ts
type PayloadAdapter<TConfig, P extends DragPayload> = {
  label: string;
  rowLabel?(card, payload, target?): string;
  canAccept(card, payload): boolean;
  canAcceptTarget?(card, payload, target?): boolean | { ok: false; reason: string };
  onAccept(card, payload, target?): Promise<{ ok: true } | { ok: false; reason: string }>;
  invalidateOnAccept?(card, target?): Array<readonly unknown[]>;
  // optional — source-side write-back invoked when the bound textarea blurs (b02-06):
  onContentEdited?(card, payload, target?): Promise<{ ok: true } | { ok: false; reason: string }>;
};
```

The same primitive serves drag-and-drop (`tag-like` — drop a Sheets badge on
a Trello tile, the connector applies a label) and click-to-bind (`clip-like`
— click a Trello card or Calendar event, the scratchpad becomes a textarea
bound to that source's body; on blur, the source connector writes the new
content back). `onAccept` covers absorption (drop / click); `onContentEdited`
is the write-back hook on the SOURCE connector.

## Payload kinds

| Kind | Shape (key fields) | Producers | Absorbers / write-back targets |
|:--|:--|:--|:--|
| `tag-like` | `{ name, description?, color?, source? }` | Sheets · `badges-with-descriptions` | Trello (per-card label) · Keep (label, dormant) · Calendar (event description prefix) |
| `clip-like` | `{ label, source: { connector, sourceId }, originalContent, parentTitle?, href?, meta? }` | Calendar event · Trello whole card · Sheets cell · Tasks task title (Keep dormant) | Scratchpad **absorber** (`onAccept` → single binding); Trello + Calendar **write-back targets** (`onContentEdited` → PUT card desc / PATCH event description) |
| `note-like` | `{ title?, body, source? }` | Scratchpad note-buffer (drag handle on the bound editor) | Trello (per-card comment **or** description) · Calendar (per-event description) · Keep (per-note body, dormant) |

## Adding a new payload kind

See the full cookbook with checklist: [`docs/contrib/add-a-plugin-payload.md`](../../../docs/contrib/add-a-plugin-payload.md) (Path B). Short version:

1. Add the new payload type to `types.ts` and extend the `DragPayload`
   discriminated union.
2. Add the matching Zod schema in `schema.ts` and append it to
   `dragPayloadSchema`.
3. Add a producer somewhere — a tile component or click handler that calls
   `emitPayload(dataTransfer, payload)` (drag) or invokes the adapter
   directly via `getPayloadAdapter(card, kind)?.onAccept(...)` (click).
4. Add `payloadAdapters[<kind>]` on every connector that should absorb it.

## Adding a new accept-adapter on an existing connector

See the full cookbook with checklist: [`docs/contrib/add-a-plugin-payload.md`](../../../docs/contrib/add-a-plugin-payload.md) (Path A). Short version:

Drop the file at `app/connectors/<id>/payload-adapters/<kind>.tsx`, then
register it in the connector's manifest:

```ts
import { tagLikeAdapter } from "./payload-adapters/tag-like";

export const manifest: ConnectorManifest<MyConfig> = {
  // …existing fields…
  payloadAdapters: { "tag-like": tagLikeAdapter },
};
```

The contract test (`app/connectors/__tests__/payload-adapter-contract.test.ts`)
fails CI when an adapter's key doesn't match a registered payload kind, when
`canAccept` / `onAccept` aren't functions, or when `onContentEdited` violates
the type signature.

## Optimistic-write retry queue

`pending-writes.ts` persists in-flight writes to
`localStorage["lens.payload_pending_write"]` under a `PendingKind` discriminator:

- `"accept"` — drop / click absorption — drains via the absorbing connector's `onAccept`.
- `"clip-edit"` — textarea blur — drains via the SOURCE connector's `onContentEdited`.

The worker drains with backoff (1s → 5s → 30s → 5m), surfaces inline
reconnect pills on permanent 401s, and survives reload. Adapters wrap their
invocation through `enqueueWrite(...)` so the UI is interactive immediately.

## Worked example — `clip-like` over scratchpad

1. User clicks a card in a Trello tile. The wrapper is a `<button>` that
   calls `useClips().toggleClip({ kind: "clip-like", label: card.name,
   source: { connector: "trello", sourceId: card.id }, originalContent:
   card.desc, parentTitle: card.listName })`.
2. `useClips` calls the scratchpad client's `setBinding(...)` directly:
   `localStorage["lens.scratchpad"]` schema v2 is `{ version: 2, binding:
   BoundSource | null, content: string }`. The new binding overwrites any
   prior binding (single active doc); `content` is seeded from
   `payload.originalContent`. The scratchpad's `note-buffer` tile re-renders
   showing the textarea + topbar `<parentTitle> | <sourceTitle>`; the bound
   source row picks up `data-clipped="true"`.
3. Re-clicking the same source row clears the binding (`clearBinding()`).
4. Editing the textarea + blurring runs the write-back path: the tile saves
   the new content locally (`updateContent(draft)`) and, if the source
   connector exposes `onContentEdited`, enqueues `{ kind: "clip-edit",
   cardId, payload }` on the retry queue. The worker resolves the SOURCE
   connector's `payloadAdapters["clip-like"].onContentEdited` and invokes
   it — Trello PUTs `/api/trello/cards/<id>` with new `desc`; Calendar
   PATCHes `/api/google/calendar/events` with new `description` (reading
   `calendarId` from `payload.meta.calendarId`).
5. Read-only sources (Sheets, Tasks, Goodreads, Trakt) omit
   `onContentEdited` entirely. The note-buffer detects this and renders the
   textarea `readonly` with a banner.

## Worked example — `note-like` over Trello

1. User types into the scratchpad note-buffer (free-form, unbound). When the
   draft is non-empty, a `GripVertical` drag handle appears at the textarea's
   top-right. `onDragStart` calls
   `emitPayload(e.dataTransfer, { kind: "note-like", body: draft, source: { connector: "scratchpad", sourceId: "free" } })`.
2. The Trello `kanban-board` tile's `<PluginRowDropTarget>` per-card row
   accepts the payload (`canAccept` true · `canAcceptTarget` true when
   `target.id` is set). The accent overlay shows on the targeted Trello card.
3. On drop, the dispatcher resolves the adapter and queues the write
   directly: `enqueueWrite({ kind: "accept", payload, cardId, target: { id: trelloCardId } })`.
   No mode picker — every `note-like` target uses the same description-append
   behavior.
4. The worker calls `adapter.onAccept(card, payload, target)`. The Trello
   adapter PUTs `/api/trello/cards/<id>` with `descAppend = noteEnvelope(payload)`.
   The route handler GETs the current `desc`, suffix-checks against the
   envelope, and PUTs only when the body content does not already trail
   (server-side idempotency).
5. Calendar follows the same shape — PATCH `/api/google/calendar/events`
   with `descriptionAppend`; the route's append-branch handles idempotency.
   Keep (dormant) follows the same pattern via the sidecar.

## Note-like adapter recipe

Adapters that absorb `note-like` payloads need only `canAccept`,
`canAcceptTarget` (per-row gating), and an `onAccept` that posts the
envelope to the connector's append endpoint:

```ts
export const noteLikeAdapter: PayloadAdapter<TrelloConfig, NoteLikePayload> = {
  label: "Trello card description",
  canAccept(_card, payload) { return payload.kind === "note-like"; },
  canAcceptTarget(_card, _payload, target) { return Boolean(target?.id); },
  async onAccept(_card, payload, target) {
    const cardId = target?.id;
    if (!cardId) return { ok: false, reason: "missing target.id" };
    const res = await fetch(`/api/trello/cards/${encodeURIComponent(cardId)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ descAppend: noteEnvelope(payload) }),
    });
    if (!res.ok) return { ok: false, reason: `Trello API ${res.status}` };
    return { ok: true };
  },
  invalidateOnAccept() { return [["trello", "cards"]]; },
};
```

Server-side idempotency lives in the route handler — clients always send the
new body and let the server suffix-check + skip the write if needed.

## Worked example — `tag-like` over Trello

1. User drags a row from a `badges-with-descriptions` tile (Sheets).
   `component.tsx`'s `onDragStart` calls
   `emitPayload(e.dataTransfer, { kind: "tag-like", name, description, color, source: { connector: "google-sheets" } })`.
2. The Trello `kanban-board` tile's `DropZone` reads the payload kind on
   `dragenter`, looks up
   `getPayloadAdapter(trelloCard, "tag-like")?.canAccept(card, payload)`,
   shows the accent overlay + tooltip if true.
3. On drop, `enqueueWrite({ kind: "accept", payload, cardId })` queues the
   write. The worker calls `adapter.onAccept(card, payload)` —
   `connectors/trello/payload-adapters/tag-like.tsx` does the
   `GET /labels?idBoard=…` + `POST /boards/:id/labels` reuse-or-create.
4. Failure surfaces an inline pill ("Trello write-back failed — reconnect")
   on the affected card chrome with a manual retry button.
