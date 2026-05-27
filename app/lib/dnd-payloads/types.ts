/**
 * Cross-tile drag-payload registry — type module.
 *
 * Discriminated union of payload kinds the plugin contract carries between
 * tiles and connector accept-adapters. v1 ships `tag-like`; b02-06 will
 * add `clip-like` to the same union.
 *
 * Source-tracking (`source`) is optional but required for kinds that round-
 * trip — e.g. Trello's `onSourceRemoved` write-back lookup in b02-06.
 */

export const PAYLOAD_MIME = "application/x-lens-payload";

/** Connector ids that mint payloads — matches `ConnectorManifest.id`. */
export type PayloadSource = {
  /** The connector that produced this payload. */
  connector: string;
  /** Optional opaque identifier for the originating row / event / item. */
  sourceId?: string;
};

/**
 * `tag-like` — a label-shaped payload (name + optional description + optional
 * semantic color token). Producers: Sheets `badges-with-descriptions` (v1).
 * Acceptors: Trello (label), Keep (label), Calendar (colorId + description prefix).
 */
export type TagLikePayload = {
  kind: "tag-like";
  name: string;
  description?: string;
  /** A semantic `--label-*` token name (`green`, `purple`, ...) — never raw hex. */
  color?: string;
  source?: PayloadSource;
};

/**
 * Required source variant — every `clip-like` MUST carry the origin so the
 * source-side `onSourceRemoved` adapter can round-trip the deselect.
 */
export type RequiredPayloadSource = {
  connector: string;
  sourceId: string;
};

/**
 * `clip-like` — a selection-binding payload emitted by per-row click handlers.
 *
 * Click a producer row (Calendar event, Trello card, Sheets cell, Task) →
 * the scratchpad becomes a single editable note bound to that source. The
 * tile's title becomes `<parentTitle> | <label>` (e.g. "NOOOW! | LENS",
 * "CALENDAR | Standup"). On blur, the live content is written back to the
 * source through the connector's `payloadAdapters["clip-like"].onContentEdited`.
 * Read-only sources (Sheets, Tasks, Goodreads, Trakt) omit `onContentEdited`
 * and the buffer renders a read-only banner.
 */
export type ClipLikePayload = {
  kind: "clip-like";
  /** Display label — event title, Trello card name, etc. — used in the title bar. */
  label: string;
  source: RequiredPayloadSource;
  /** Container title — Trello list name, "CALENDAR", sheet name, tasklist name. */
  parentTitle?: string;
  /** Editable body — Trello card desc, Calendar event description, etc. Required. */
  originalContent: string;
  /** Optional deep-link to the source item. */
  href?: string;
  /**
   * Connector-specific routing metadata for the round-trip. e.g. Calendar
   * needs `{ calendarId }` to PATCH the right event; `(calendarId, eventId)`
   * is the event's identity.
   */
  meta?: Record<string, string>;
};

/**
 * `note-like` — a text-content payload that moves a body (and optional title)
 * from the free-form scratchpad onto a target connector's row. Producers:
 * scratchpad note-buffer (v1, drag handle visible only when unbound + non-empty).
 * Acceptors: Trello (per-card description-append), Google Calendar (per-event
 * description-append), Keep (per-note body-append, dormant). Single behavior
 * across all targets — no mode picker. Idempotency lives server-side in the
 * route handlers: GET existing content, suffix-skip when the body already
 * trails, otherwise PUT/PATCH the appended form.
 */
export type NoteLikePayload = {
  kind: "note-like";
  title?: string;
  body: string;
  source?: PayloadSource;
};

export type DragPayload = TagLikePayload | ClipLikePayload | NoteLikePayload;

/** Kind ids — kept as a typed string union so dispatchers are exhaustive. */
export type DragPayloadKind = DragPayload["kind"];
