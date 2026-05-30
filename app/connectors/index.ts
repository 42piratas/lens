// AUTO-GENERATED — do not edit. Run `pnpm gen:registries` to regenerate.
//
// Source of truth: each `app/connectors/<id>/manifest.tsx`.
// To add a connector: copy `_template/`, edit the manifest, run `pnpm gen:registries`.
//
import type { ConnectorManifest } from "./types";
import { manifest as githubManifest } from "./github/manifest";
import { manifest as goodreadsManifest } from "./goodreads/manifest";
import { manifest as googleCalendarManifest } from "./google-calendar/manifest";
import { manifest as googleSheetsManifest } from "./google-sheets/manifest";
import { manifest as googleTasksManifest } from "./google-tasks/manifest";
import { manifest as keepManifest } from "./keep/manifest";
import { manifest as scratchpadManifest } from "./scratchpad/manifest";
import { manifest as traktManifest } from "./trakt/manifest";
import { manifest as trelloManifest } from "./trello/manifest";

const allManifests: ConnectorManifest<unknown>[] = [
  githubManifest as ConnectorManifest<unknown>,
  goodreadsManifest as ConnectorManifest<unknown>,
  googleCalendarManifest as ConnectorManifest<unknown>,
  googleSheetsManifest as ConnectorManifest<unknown>,
  googleTasksManifest as ConnectorManifest<unknown>,
  keepManifest as ConnectorManifest<unknown>,
  scratchpadManifest as ConnectorManifest<unknown>,
  traktManifest as ConnectorManifest<unknown>,
  trelloManifest as ConnectorManifest<unknown>,
];

const manifests: ConnectorManifest<unknown>[] = allManifests.filter(
  (m) => m.enabled === undefined || m.enabled(),
);

const byId = new Map<string, ConnectorManifest<unknown>>(
  manifests.map((m) => [m.id, m] as const),
);

export function getConnectors(): ConnectorManifest<unknown>[] {
  return manifests;
}

export function getConnector(id: string): ConnectorManifest<unknown> | undefined {
  return byId.get(id);
}

export type { ConnectorManifest, LayoutCard } from "./types";
