"use client";

import { GripVertical } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { getConnector } from "@/connectors";
import { useLayoutStore } from "@/lib/layout/store";
import { useScratchpad } from "@/lib/hooks/use-scratchpad";
import { emitPayload } from "@/lib/dnd-payloads";
import { useDragContext } from "@/lib/dnd-payloads/drag-context";
import { enqueueWrite } from "@/lib/dnd-payloads/pending-writes";
import type { ClipLikePayload, NoteLikePayload } from "@/lib/dnd-payloads/types";
import type { BoundSource } from "@/connectors/scratchpad/types";

/**
 * Free-form / bound scratchpad editor. Always editable:
 *   - Unbound: free-form text. Drag handle drops a `note-like` payload onto a
 *     target card/event/sheet row → that target gets a comment / appended
 *     description (b02-09).
 *   - Bound: clicking a producer row binds the scratchpad to that source. Edit
 *     + blur enqueues a `clip-edit` write-back via the source connector's
 *     `onContentEdited` (b02-06). The drag handle stays — drop the bound text
 *     onto a different target to attach it elsewhere.
 *   - Read-only sources (no `onContentEdited`) render a banner; blur is a
 *     no-op write-back, but drag still works.
 */
export function ScratchpadListTile() {
  const { state, updateContent } = useScratchpad();
  return (
    <ScratchpadEditor
      binding={state.binding}
      content={state.content}
      updateContent={updateContent}
    />
  );
}

function ScratchpadEditor({
  binding,
  content,
  updateContent,
}: {
  binding: BoundSource | null;
  content: string;
  updateContent: (content: string) => void;
}) {
  const [draft, setDraft] = useState(content);
  const [dragging, setDragging] = useState(false);
  // Re-sync the draft when the binding flips (or clears).
  const bindingId = binding ? `${binding.connector}::${binding.sourceId}` : "__free__";
  const lastIdRef = useRef(bindingId);
  useEffect(() => {
    if (lastIdRef.current !== bindingId) {
      lastIdRef.current = bindingId;
      setDraft(content);
    }
  }, [bindingId, content]);

  const writable = binding ? isWritable(binding.connector) : true;

  const handleBlur = () => {
    if (draft === content) return;
    updateContent(draft);
    if (!binding) return;
    const writeback = buildClipEditWriteback({
      binding,
      draft,
      writable,
      findCardByConnector: (connectorId) =>
        useLayoutStore.getState().cards.find((c) => c.connector === connectorId),
    });
    if (writeback) enqueueWrite(writeback);
  };

  // Drag affordance is for free-form notes only — when bound, the editor
  // round-trips to its source via `onContentEdited`, so re-attaching to a
  // different target via drag would be confusing. Bound = no drag.
  const canDrag = !binding && draft.trim().length > 0;

  return (
    <div className="lens-scratchpad-editor">
      <div
        className="lens-scratchpad-card"
        draggable={canDrag}
        data-can-drag={canDrag ? "true" : undefined}
        data-dragging={dragging ? "true" : undefined}
        title={
          canDrag
            ? "Drag onto a card or event to attach this note"
            : undefined
        }
        onDragStart={(e) => {
          if (!canDrag) {
            e.preventDefault();
            return;
          }
          // canDrag implies !binding — drag is gated to free-form notes only.
          const payload: NoteLikePayload = {
            kind: "note-like",
            body: draft,
            source: { connector: "scratchpad", sourceId: "free" },
          };
          emitPayload(e.dataTransfer, payload);
          useDragContext.getState().beginDrag(payload);
          setDragging(true);
        }}
        onDragEnd={() => {
          useDragContext.getState().endDrag();
          setDragging(false);
        }}
      >
        <textarea
          className="lens-scratchpad-textarea card-text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={handleBlur}
          readOnly={!writable}
          spellCheck
        />
        {!binding && (
          <span
            className="lens-scratchpad-drag-icon"
            data-can-drag={canDrag ? "true" : undefined}
            aria-hidden
          >
            <GripVertical size={14} strokeWidth={1.75} />
          </span>
        )}
      </div>
      {!writable && (
        <span className="meta-mono lens-scratchpad-readonly">
          Read-only — this source cannot be written from here
        </span>
      )}
    </div>
  );
}

function isWritable(connectorId: string): boolean {
  return Boolean(getConnector(connectorId)?.payloadAdapters?.["clip-like"]?.onContentEdited);
}

/**
 * Pure helper — given the current binding, draft, and a way to resolve a live
 * card for the binding's connector, return the writeback enqueue entry (or
 * null if there's nothing to enqueue: read-only source, or no live card).
 * Extracted so the blur path is unit-testable without rendering React.
 */
export function buildClipEditWriteback({
  binding,
  draft,
  writable,
  findCardByConnector,
}: {
  binding: BoundSource;
  draft: string;
  writable: boolean;
  findCardByConnector: (connectorId: string) => { id: string } | undefined;
}): { kind: "clip-edit"; cardId: string; payload: ClipLikePayload } | null {
  if (!writable) return null;
  const card = findCardByConnector(binding.connector);
  if (!card) return null;
  const payload: ClipLikePayload = {
    kind: "clip-like",
    label: binding.sourceTitle,
    source: { connector: binding.connector, sourceId: binding.sourceId },
    parentTitle: binding.parentTitle,
    originalContent: draft,
    href: binding.href,
    meta: binding.meta,
  };
  return { kind: "clip-edit", cardId: card.id, payload };
}

/** Topbar — `<PARENT> | <TITLE>` while bound; otherwise the tile's default label. */
export function NoteBufferTopbar() {
  const { state } = useScratchpad();
  const b = state.binding;
  if (!b) {
    return (
      <span className="lens-card-topbar-label-wrap">
        <span className="lens-card-topbar-label" title="Scratchpad">
          Scratchpad
        </span>
      </span>
    );
  }
  const parent = b.parentTitle ?? sourceFallback(b.connector);
  const label = parent ? `${parent} | ${b.sourceTitle}` : b.sourceTitle;
  return (
    <span className="lens-card-topbar-label-wrap">
      {b.href ? (
        <a
          className="lens-card-topbar-label"
          data-link="true"
          href={b.href}
          target="_blank"
          rel="noreferrer noopener"
          title={label}
        >
          {label}
        </a>
      ) : (
        <span className="lens-card-topbar-label" title={label}>
          {label}
        </span>
      )}
    </span>
  );
}

function sourceFallback(connectorId: string): string {
  switch (connectorId) {
    case "google-calendar":
      return "CALENDAR";
    case "google-sheets":
      return "SHEETS";
    case "google-tasks":
      return "TASKS";
    case "trello":
      return "TRELLO";
    default:
      return connectorId.toUpperCase();
  }
}
