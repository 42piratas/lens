/**
 * Cross-tile drag-payload registry.
 *
 * `emitPayload` writes the payload onto a `DataTransfer` so a foreign
 * connector's accept-adapter can absorb it. `parseDragPayload` validates
 * the inbound shape and returns null on mismatch (incompatible drag —
 * silently ignored).
 *
 * Adapter dispatch lives in `@/connectors`; the helpers here are only for
 * (de)serialization and per-card adapter resolution.
 */
import type { LayoutCard } from "@/connectors/types";
import { getConnector } from "@/connectors";
import type {
  DragPayload,
  DragPayloadKind,
} from "./types";
import { PAYLOAD_MIME } from "./types";
import { dragPayloadSchema } from "./schema";

export type {
  DragPayload,
  DragPayloadKind,
  TagLikePayload,
  ClipLikePayload,
  NoteLikePayload,
  PayloadSource,
  RequiredPayloadSource,
} from "./types";
export { PAYLOAD_MIME } from "./types";
export {
  dragPayloadSchema,
  clipLikeSchema,
  tagLikeSchema,
  noteLikeSchema,
} from "./schema";

function plainTextFor(payload: DragPayload): string {
  switch (payload.kind) {
    case "tag-like":
      return payload.name;
    case "clip-like":
      return payload.label;
    case "note-like":
      return payload.title ?? payload.body;
  }
}

/** Write a typed payload onto a DataTransfer. */
export function emitPayload(transfer: DataTransfer, payload: DragPayload): void {
  const json = JSON.stringify(payload);
  transfer.setData(PAYLOAD_MIME, json);
  // Plain-text fallback so the OS-level drag affordance shows something
  // sensible if the drop happens outside the app.
  transfer.setData("text/plain", plainTextFor(payload));
  transfer.effectAllowed = "copy";
}

/** Parse + validate a payload from a DataTransfer. Returns null on shape mismatch. */
export function parseDragPayload(transfer: DataTransfer | null | undefined): DragPayload | null {
  if (!transfer) return null;
  const raw = transfer.getData(PAYLOAD_MIME);
  if (!raw) return null;
  try {
    const parsed = dragPayloadSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/**
 * Resolve a per-card accept-adapter for a payload kind. Returns undefined when:
 *  - the card's connector is unknown
 *  - the connector did not register a payloadAdapter for the kind
 *
 * Drop-zone UI calls this during `dragenter`/`dragover` to gate the affordance.
 */
export function getPayloadAdapter(
  card: LayoutCard,
  kind: DragPayloadKind,
) {
  const connector = getConnector(card.connector);
  return connector?.payloadAdapters?.[kind];
}

