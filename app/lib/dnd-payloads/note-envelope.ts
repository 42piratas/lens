import type { NoteLikePayload } from "./types";

/**
 * Envelope helper for `note-like` writes. The envelope is just the optional
 * title (on its own line) followed by the body — no attribution footer, no
 * marker. Idempotency on description-style targets (Trello desc, Calendar
 * event description) is a trailing-suffix check on the envelope text itself:
 * if the description already ends with the same envelope, the writer skips.
 */

export function noteEnvelope(payload: NoteLikePayload): string {
  const title = payload.title?.trim();
  const body = payload.body.trim();
  return title ? `${title}\n${body}` : body;
}

/**
 * True iff the envelope text already trails `existing`. Used by description-
 * mode writers to skip a no-op re-drop without adding a hidden marker to the
 * target.
 */
export function alreadyContainsEnvelope(
  existing: string,
  payload: NoteLikePayload,
): boolean {
  const env = noteEnvelope(payload);
  if (!env) return true;
  return existing.trimEnd().endsWith(env);
}
