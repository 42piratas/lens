import type { ComponentType, ReactNode } from "react";
import type { z } from "zod";
import type { TileAdapter, TileManifest } from "@/tiles/types";
import type { DragPayload, DragPayloadKind } from "@/lib/dnd-payloads/types";

export type LayoutCard<TConfig = unknown> = {
  id: string;
  connector: string;
  tile: string;
  x: number;
  y: number;
  w: number;
  h: number;
  config: TConfig;
};

/**
 * Per-(connector, payload-kind) accept-adapter. Drives the cross-tile drag
 * primitive — the source tile emits a typed payload, the target tile's
 * connector absorbs it via its registered adapter.
 *
 * `onAccept` covers all entry points (drop, click-emit, programmatic) so
 * the same contract serves drag-and-drop and click-to-clip without rename.
 *
 * Adapters that require a per-row target (e.g. Trello card row, Calendar
 * event) declare `rowLabel` and gate their `onAccept` on `target.id`. Tiles
 * mount `<PluginRowDropTarget>` per row so the row-level overlay shows the
 * `rowLabel` pill while ambient `lens-plugin-dropzone` styling on the tile
 * body announces "this tile accepts the payload" globally.
 *
 * `onContentEdited` is invoked when a `clip-like` payload's editable content
 * changes in the absorber (scratchpad note-buffer on blur). Read-only sources
 * (Sheets, Tasks, Goodreads, Trakt) omit it; the buffer renders a read-only
 * banner instead. Implemented by Trello (PUT card desc) and Calendar (PATCH
 * event description) in b02-06.
 */
export type PayloadAcceptTarget = {
  id: string;
  /** Per-target metadata threaded by the tile (e.g. event's `calendarId`). */
  meta?: Record<string, string>;
};

export type PayloadAdapter<TConfig, P extends DragPayload = DragPayload> = {
  label: string;
  rowLabel?: string;
  canAccept(card: LayoutCard<TConfig>, payload: P): boolean;
  canAcceptTarget?(
    card: LayoutCard<TConfig>,
    payload: P,
    target: PayloadAcceptTarget,
  ): boolean;
  onAccept(
    card: LayoutCard<TConfig>,
    payload: P,
    target?: PayloadAcceptTarget,
  ): Promise<{ ok: true } | { ok: false; reason: string }>;
  onContentEdited?(
    card: LayoutCard<TConfig>,
    payload: P,
    target?: PayloadAcceptTarget,
  ): Promise<{ ok: true } | { ok: false; reason: string }>;
  /**
   * Query-key prefixes to invalidate after a successful `onAccept`. The
   * pending-writes worker resolves the app's QueryClient and calls
   * `invalidateQueries({ queryKey })` for each entry, prompting the affected
   * tiles to refetch and reflect the side effect.
   */
  invalidateOnAccept?(
    card: LayoutCard<TConfig>,
    target?: PayloadAcceptTarget,
  ): readonly (readonly unknown[])[];
};

export type ConnectorManifest<TConfig = unknown> = {
  id: string;
  name: string;
  icon: ReactNode;
  description: string;
  auth: { envVars: string[]; setupDoc: string };
  configSchema: z.ZodType<TConfig>;
  defaultConfig: () => TConfig;
  tiles: string[];
  /**
   * Optional feature flag — registry filters out connectors whose `enabled()`
   * returns false. Used by env-flag deferred connectors so the build-time
   * codegen can register every folder unconditionally and runtime gating
   * lives on the manifest. Default (absent) = enabled.
   *
   * Per-user gates (e.g. Keep's Workspace gate, b02-12) sit at the picker
   * layer instead — see `components/panel/AddCardPanel.tsx`.
   */
  enabled?: () => boolean;
  /**
   * Adapters for shared tiles — keyed by tile id. Required when this
   * connector lists a shared tile (one whose component dispatches via the
   * adapter registry rather than importing this connector's hooks directly).
   */
  tileAdapters?: Record<string, TileAdapter<TConfig>>;
  /**
   * Accept-adapters for cross-tile drag payloads — keyed by `DragPayload.kind`.
   * Optional. Only set on connectors that absorb foreign payloads (Trello
   * label, Keep label, Calendar colorId+description, scratchpad clip, …).
   */
  payloadAdapters?: Partial<Record<DragPayloadKind, PayloadAdapter<TConfig>>>;
  ConfigBody: ComponentType<{
    config: TConfig;
    tile: TileManifest<TConfig>;
    onChange: (next: TConfig) => void;
  }>;
};
