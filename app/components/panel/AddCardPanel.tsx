"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { useSession } from "next-auth/react";
import { getConnectors, getConnector } from "@/connectors";
import { getTile, getTilesForConnector } from "@/tiles";
import { useLayoutStore } from "@/lib/layout/store";
import { findFirstAvailableSlot } from "@/lib/layout/placement";
import { usePanelStore } from "@/lib/panel/store";
import { ConnectorPicker } from "./ConnectorPicker";
import { ModePicker } from "./ModePicker";
import { SizePicker, getSizeError } from "./SizePicker";

export function AddCardPanel() {
  const panelMode = usePanelStore((s) => s.mode);
  const editingId = usePanelStore((s) => s.editingId);
  const draft = usePanelStore((s) => s.draft);
  const setDraft = usePanelStore((s) => s.setDraft);
  const close = usePanelStore((s) => s.close);

  const cards = useLayoutStore((s) => s.cards);
  const addCard = useLayoutStore((s) => s.addCard);
  const updateCard = useLayoutStore((s) => s.updateCard);
  const removeCard = useLayoutStore((s) => s.removeCard);

  const [placementError, setPlacementError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<null | "delete" | "connector-change">(null);
  const [pendingConnectorChange, setPendingConnectorChange] = useState<string | null>(null);

  const { data: session } = useSession();
  // Keep is hidden unless the signed-in user's Workspace hosted-domain
  // matches NEXT_PUBLIC_LENS_KEEP_WORKSPACE_DOMAIN. Keep is reached via a
  // service account + domain-wide delegation (b02-12), and the SA can only
  // impersonate users in the specific Workspace org the admin configured.
  // Type augmentation across pnpm's split @auth/core copies is brittle, so
  // we narrow at the call site.
  const hd =
    (session?.user as { hd?: string | null } | undefined)?.hd ?? null;
  const keepDomain = process.env.NEXT_PUBLIC_LENS_KEEP_WORKSPACE_DOMAIN ?? "";
  const keepAvailable = Boolean(
    keepDomain && hd && hd.toLowerCase() === keepDomain.toLowerCase(),
  );
  const connectors = useMemo(
    () => getConnectors().filter((c) => c.id !== "keep" || keepAvailable),
    [keepAvailable],
  );
  const manifest = draft.connector ? getConnector(draft.connector) : undefined;
  const tilesForConnector = useMemo(
    () => (manifest ? getTilesForConnector(manifest.tiles) : []),
    [manifest],
  );
  const tile = draft.tile ? getTile(draft.tile) : undefined;

  useEffect(() => {
    if (panelMode === "closed") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panelMode, close]);

  if (panelMode === "closed") return null;

  const handleConnector = (id: string) => {
    if (panelMode === "edit" && draft.connector && draft.connector !== id) {
      setPendingConnectorChange(id);
      setConfirm("connector-change");
      return;
    }
    const m = getConnector(id);
    if (!m) return;
    const firstTile = getTilesForConnector(m.tiles)[0];
    if (!firstTile) return;
    setDraft({
      connector: id,
      tile: firstTile.id,
      w: firstTile.defaultSize.w,
      h: firstTile.defaultSize.h,
      config: m.defaultConfig(),
    });
    setPlacementError(null);
  };

  const handleTile = (tileId: string) => {
    if (!manifest) return;
    const newTile = getTile(tileId);
    if (!newTile) return;
    setDraft({
      tile: tileId,
      w: draft.w ?? newTile.defaultSize.w,
      h: draft.h ?? newTile.defaultSize.h,
    });
    setPlacementError(null);
  };

  const handleSize = (next: { w: number; h: number }) => {
    setDraft({ w: next.w, h: next.h });
    setPlacementError(null);
  };

  const sizeError = getSizeError(tile, draft.w, draft.h);
  const canSave =
    !!manifest &&
    !!tile &&
    typeof draft.w === "number" &&
    typeof draft.h === "number" &&
    !sizeError;

  const onSave = () => {
    if (!canSave || !manifest || !tile) return;
    const w = draft.w as number;
    const h = draft.h as number;
    const cfgParse = manifest.configSchema.safeParse(draft.config ?? manifest.defaultConfig());
    if (!cfgParse.success) {
      setPlacementError("Connector config is invalid.");
      return;
    }

    if (panelMode === "add") {
      const slot = findFirstAvailableSlot(cards, w, h);
      if (!slot) {
        setPlacementError("No space available — remove or resize a card first.");
        return;
      }
      addCard({
        id: crypto.randomUUID(),
        connector: manifest.id,
        tile: tile.id,
        x: slot.x,
        y: slot.y,
        w,
        h,
        config: cfgParse.data,
      });
      close();
      return;
    }

    if (panelMode === "edit" && editingId) {
      const current = cards.find((c) => c.id === editingId);
      if (!current) {
        close();
        return;
      }
      const fitsAtCurrent =
        current.x + w <= 20 &&
        current.y + h <= 20 &&
        !cards.some(
          (c) =>
            c.id !== editingId &&
            current.x < c.x + c.w &&
            c.x < current.x + w &&
            current.y < c.y + c.h &&
            c.y < current.y + h,
        );
      if (fitsAtCurrent) {
        updateCard(editingId, {
          connector: manifest.id,
          tile: tile.id,
          w,
          h,
          config: cfgParse.data,
        });
        close();
        return;
      }
      const slot = findFirstAvailableSlot(cards, w, h, editingId);
      if (!slot) {
        setPlacementError("No space available — remove or resize a card first.");
        return;
      }
      updateCard(editingId, {
        connector: manifest.id,
        tile: tile.id,
        x: slot.x,
        y: slot.y,
        w,
        h,
        config: cfgParse.data,
      });
      close();
    }
  };

  const onDelete = () => setConfirm("delete");
  const onConfirmDelete = () => {
    if (editingId) removeCard(editingId);
    setConfirm(null);
    close();
  };
  const onConfirmConnectorChange = () => {
    if (pendingConnectorChange) {
      const m = getConnector(pendingConnectorChange);
      if (m) {
        const firstTile = getTilesForConnector(m.tiles)[0];
        if (firstTile) {
          setDraft({
            connector: pendingConnectorChange,
            tile: firstTile.id,
            w: firstTile.defaultSize.w,
            h: firstTile.defaultSize.h,
            config: m.defaultConfig(),
          });
        }
      }
    }
    setPendingConnectorChange(null);
    setConfirm(null);
  };

  const ConfigBody = manifest?.ConfigBody;

  return (
    <div className="lens-panel-root" role="dialog" aria-modal="false" aria-label={panelMode === "add" ? "Add a card" : "Edit card"}>
      <aside className="lens-panel-aside">
        <header className="lens-panel-header">
          <span className="tile-label">{panelMode === "add" ? "Add a card" : "Edit card"}</span>
          <button
            type="button"
            onClick={close}
            aria-label="Close panel"
            title="Cancel (Esc)"
            className="lens-panel-close"
          >
            <X size={18} strokeWidth={1.75} aria-hidden />
          </button>
        </header>

        <div className="lens-panel-body">
          <ConnectorPicker
            connectors={connectors}
            selected={draft.connector}
            onSelect={handleConnector}
          />

          {manifest && (
            <ModePicker
              tiles={tilesForConnector}
              selected={draft.tile}
              onSelect={handleTile}
            />
          )}

          {tile && (
            <SizePicker tile={tile} w={draft.w} h={draft.h} onChange={handleSize} />
          )}

          {ConfigBody && manifest && tile && draft.config !== undefined && (
            <div className="lens-panel-section">
              <span className="tile-label">Configuration</span>
              <ConfigBody
                config={draft.config as never}
                tile={tile as never}
                onChange={(next: unknown) => setDraft({ config: next })}
              />
            </div>
          )}

          {placementError && (
            <div className="lens-panel-error" role="alert">{placementError}</div>
          )}
        </div>

        <footer className="lens-panel-footer">
          {panelMode === "edit" && (
            <button
              type="button"
              onClick={onDelete}
              className="lens-panel-btn lens-panel-btn--ghost lens-panel-btn--delete"
            >
              Delete
            </button>
          )}
          <span className="lens-panel-spacer" />
          <button type="button" onClick={close} className="lens-panel-btn lens-panel-btn--ghost">
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={!canSave}
            className="lens-panel-btn lens-panel-btn--primary"
          >
            Save
          </button>
        </footer>
      </aside>

      {confirm === "delete" && (
        <ConfirmDialog
          title="Delete card?"
          body="This cannot be undone. The card and its config will be removed from the layout."
          confirmLabel="Delete"
          onCancel={() => setConfirm(null)}
          onConfirm={onConfirmDelete}
          destructive
        />
      )}
      {confirm === "connector-change" && (
        <ConfirmDialog
          title="Change connector?"
          body="Switching connector discards the current connector-specific configuration."
          confirmLabel="Change"
          onCancel={() => {
            setPendingConnectorChange(null);
            setConfirm(null);
          }}
          onConfirm={onConfirmConnectorChange}
        />
      )}
    </div>
  );
}

function ConfirmDialog({
  title,
  body,
  confirmLabel,
  onCancel,
  onConfirm,
  destructive,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
  destructive?: boolean;
}) {
  return (
    <div className="lens-confirm-root" role="dialog" aria-modal="true" aria-label={title}>
      <div className="lens-confirm-backdrop" onClick={onCancel} aria-hidden />
      <div className="lens-confirm-card">
        <span className="tile-label">{title}</span>
        <p className="card-text">{body}</p>
        <div className="lens-confirm-actions">
          <button type="button" onClick={onCancel} className="lens-panel-btn lens-panel-btn--ghost">
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`lens-panel-btn ${destructive ? "lens-panel-btn--danger" : "lens-panel-btn--primary"}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
