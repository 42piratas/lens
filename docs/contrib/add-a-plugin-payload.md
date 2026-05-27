# Add a plugin payload

LENS plugins are the cross-tile drag-payload primitive — drag a producer (e.g. a Sheets row) onto a foreign connector's tile, and the connector absorbs the payload into its native model. As of b02-06 the system ships **two payload kinds**:

| Kind | Carries | Producers (today) | Absorbers |
|:--|:--|:--|:--|
| `tag-like` | A label (name + optional color) | Sheets `badges-with-descriptions` | Trello (board label), Calendar (event description prefix), Keep (label) |
| `clip-like` | A bound source + editable content | Calendar events, Trello cards | Scratchpad (note-buffer) — round-trips writes back via `onContentEdited` |

Adding a third kind (e.g. `note-like`) means extending the registry, defining a new producer, and writing absorber adapters on every compatible connector. This guide covers both:

1. **Adding a new payload kind** (the heavier path)
2. **Adding a new absorber adapter for an existing kind** (the lighter path — most common)

Read first: [`app/lib/dnd-payloads/README.md`](../../app/lib/dnd-payloads/README.md) — the runtime contract for `DragPayload`, the retry queue, and `PayloadAdapter`.

## Path A: New absorber for an existing kind

You want a connector to start accepting an existing payload kind. Concrete example: Keep accepts `tag-like` so dragging a Sheets badge onto a Keep tile creates a Keep label.

1. **Write the adapter** at `app/connectors/<id>/payload-adapters/<kind>.tsx`:
   ```ts
   export const tagLikeAdapter: PayloadAdapter<KeepConfig, TagLikePayload> = {
     label: "Apply as Keep label",
     canAccept(card, payload) {
       return payload.kind === "tag-like";
     },
     async onAccept(card, payload, target) {
       // 1. Validate, 2. POST to upstream, 3. Return ok/err.
     },
     invalidateOnAccept: () => [["keep", "labels"]],
   };
   ```
2. **Register on the connector's manifest**:
   ```ts
   payloadAdapters: { "tag-like": tagLikeAdapter },
   ```
3. **For per-row drops** (e.g. drop on a specific Trello card, not the whole tile), implement `canAcceptTarget(card, payload, target)` — return `true` only when `target.id` resolves to a real row. The tile mounts `<PluginRowDropTarget>` per row to provide the target.
4. **For round-trip absorbers** (e.g. scratchpad clip-like), implement `onContentEdited(card, payload, target?)` — the buffer calls this on blur to write the new content back through the producer's connector. Read-only sources omit it.
5. **Test** at `app/connectors/<id>/__tests__/<kind>-adapter.test.ts`. Cover happy path, idempotency, 401 → reconnect-pill behavior.

## Path B: New payload kind

You want a fundamentally new shape of dragged data. Concrete example: `note-like` carries text body to be written into a target item's description / comment.

1. **Define the payload type** in `app/lib/dnd-payloads/types.ts`:
   ```ts
   export type NoteLikePayload = {
     kind: "note-like";
     title?: string;
     body: string;
     source?: PayloadSource;
   };
   export type DragPayload = TagLikePayload | ClipLikePayload | NoteLikePayload;
   ```
2. **Add the Zod schema** in `app/lib/dnd-payloads/schema.ts` and extend `parseDragPayload` to discriminate on `kind`.
3. **Round-trip test** in `app/lib/dnd-payloads/__tests__/registry.test.ts` — emit + parse must equal.
4. **Define producers.** Add `data-payload-kind="<kind>"` and an `onDragStart` handler on the producer rows; wire to `useDragContext().beginDrag(payload)`.
5. **Define absorbers.** For each connector that accepts the new kind, follow Path A.
6. **Update the worked example list** in `app/lib/dnd-payloads/README.md` so contributors can see the third kind alongside `tag-like` + `clip-like`.

## Multi-mode adapters (post-b02-09)

When an adapter has multiple ways to absorb the same payload (e.g. Trello can take `note-like` as a comment OR as appended description), declare:

```ts
modes: [
  { id: "comment", label: "As comment" },
  { id: "description", label: "Append to description" },
],
```

The drop dispatcher renders a tiny picker on drop; the selected mode id flows into `onAccept` via `target.meta.mode`. Single-mode adapters omit the field and the picker doesn't render.

## Retry queue

Every absorber's `onAccept` runs through the retry queue (`app/lib/dnd-payloads/pending-writes.ts`). Failures backoff `1s → 5s → 30s → 5m`; permanent 401s register the inline reconnect pill on the affected card chrome. You don't wire any of this — just return `{ ok: false, reason }` for retriable errors and the queue handles the rest.

## 10-minute checklist (Path A — new absorber)

- [ ] `app/connectors/<id>/payload-adapters/<kind>.tsx` exists and exports a typed `PayloadAdapter`
- [ ] Adapter registered in the connector's manifest under `payloadAdapters`
- [ ] (Per-row drops) `canAcceptTarget` implemented; tile mounts `<PluginRowDropTarget>`
- [ ] (Round-trip) `onContentEdited` implemented for write-back kinds
- [ ] `__tests__/<kind>-adapter.test.ts` covers happy + idempotent + 401 paths
- [ ] `pnpm typecheck && pnpm lint && pnpm test --run && pnpm build` green
- [ ] PR opened against `main`

## 10-minute checklist (Path B — new kind)

- [ ] New payload type added to `lib/dnd-payloads/types.ts` + schema in `schema.ts`
- [ ] `DragPayload` discriminated union extended; `parseDragPayload` handles the new `kind`
- [ ] Round-trip test in `lib/dnd-payloads/__tests__/registry.test.ts` passes
- [ ] At least one producer and one absorber wired
- [ ] Worked example added to `lib/dnd-payloads/README.md`
- [ ] Path A checklist completed for the absorber side
