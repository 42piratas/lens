#!/usr/bin/env node
import { readFileSync, readdirSync, writeFileSync, statSync, existsSync, realpathSync, mkdirSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const APP_ROOT = resolve(__dirname, "..");

const BANNER = "// AUTO-GENERATED — do not edit. Run `pnpm gen:registries` to regenerate.\n";
const CSS_BANNER = "/* AUTO-GENERATED — do not edit. Run `pnpm gen:registries` to regenerate. */\n";

// Connector ids that need a custom URL prefix under `app/api/`. Default is
// `id` itself (e.g. `goodreads` → `/api/goodreads/...`). Multi-vendor ids
// (`google-calendar`) collapse the dash to a slash so the existing public
// URL surface (`/api/google/calendar/...`) stays stable across the move.
const CONNECTOR_API_PREFIX_OVERRIDES: Record<string, string> = {
  "google-calendar": "google/calendar",
  "google-sheets": "google/sheets",
  "google-tasks": "google/tasks",
};


type SurfaceId = "connectors" | "tiles" | "themes";

type FolderEntry = {
  folder: string;
  varName: string;
  manifestRel: string;
  manifestId: string;
};

function kebabToCamel(s: string): string {
  return s.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
}

function readFolders(absDir: string): string[] {
  return readdirSync(absDir)
    .filter((name) => !name.startsWith("_"))
    .filter((name) => !name.startsWith("."))
    .filter((name) => {
      const full = join(absDir, name);
      try {
        return statSync(full).isDirectory();
      } catch {
        return false;
      }
    })
    .sort();
}

function findManifestFile(folderAbs: string): string | null {
  for (const ext of [".tsx", ".ts"]) {
    const candidate = join(folderAbs, `manifest${ext}`);
    if (existsSync(candidate)) return `manifest${ext}`;
  }
  return null;
}

function parseManifestId(absFile: string): string | null {
  const src = readFileSync(absFile, "utf8");
  const match = src.match(/\bid:\s*["']([^"']+)["']/);
  return match ? match[1] : null;
}

function collect(surface: SurfaceId): FolderEntry[] {
  const surfaceAbs = join(APP_ROOT, surface);
  const folders = readFolders(surfaceAbs);
  const entries: FolderEntry[] = [];

  for (const folder of folders) {
    const folderAbs = join(surfaceAbs, folder);
    const manifestFile = findManifestFile(folderAbs);
    if (!manifestFile) {
      throw new Error(
        `[${surface}] folder "${folder}" is missing manifest.ts / manifest.tsx (looked under ${folderAbs}). Add the manifest or rename the folder with a leading "_" to exclude from the registry.`,
      );
    }
    if (surface === "themes") {
      const tokensCss = join(folderAbs, "tokens.css");
      if (!existsSync(tokensCss)) {
        throw new Error(
          `[themes] folder "${folder}" is missing tokens.css (expected at ${tokensCss}).`,
        );
      }
    }
    const manifestAbs = join(folderAbs, manifestFile);
    const manifestId = parseManifestId(manifestAbs);
    if (!manifestId) {
      throw new Error(
        `[${surface}] could not parse \`id: "..."\` from ${manifestAbs}. The codegen requires the manifest's id to appear as a single quoted string literal on its own line.`,
      );
    }
    if (manifestId !== folder) {
      throw new Error(
        `[${surface}] manifest id "${manifestId}" in ${manifestAbs} does not match folder name "${folder}". Rename the folder or update the manifest so they agree.`,
      );
    }
    const varName = `${kebabToCamel(folder)}Manifest`;
    const manifestRel = manifestFile.replace(/\.(ts|tsx)$/, "");
    entries.push({ folder, varName, manifestRel, manifestId });
  }
  return entries;
}

function renderConnectorsIndex(entries: FolderEntry[]): string {
  const imports = entries
    .map((e) => `import { manifest as ${e.varName} } from "./${e.folder}/${e.manifestRel}";`)
    .join("\n");
  const arrayBody = entries
    .map((e) => `  ${e.varName} as ConnectorManifest<unknown>,`)
    .join("\n");
  return `${BANNER}//
// Source of truth: each \`app/connectors/<id>/manifest.tsx\`.
// To add a connector: copy \`_template/\`, edit the manifest, run \`pnpm gen:registries\`.
//
import type { ConnectorManifest } from "./types";
${imports}

const allManifests: ConnectorManifest<unknown>[] = [
${arrayBody}
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
`;
}

function renderTilesIndex(entries: FolderEntry[]): string {
  const imports = entries
    .map((e) => `import { manifest as ${e.varName} } from "./${e.folder}/${e.manifestRel}";`)
    .join("\n");
  const arrayBody = entries
    .map((e) => `  ${e.varName} as TileManifest<unknown>,`)
    .join("\n");
  return `${BANNER}//
// Source of truth: each \`app/tiles/<id>/manifest.ts\`.
// To add a tile: copy \`_template/\`, edit the manifest, run \`pnpm gen:registries\`.
//
import type { LayoutCard } from "@/connectors/types";
import { getConnector } from "@/connectors";
import type { TileAdapter, TileManifest } from "./types";
${imports}

const manifests: TileManifest<unknown>[] = [
${arrayBody}
];

const byId = new Map<string, TileManifest<unknown>>(
  manifests.map((m) => [m.id, m] as const),
);

export function getTiles(): TileManifest<unknown>[] {
  return manifests;
}

export function getTile(id: string): TileManifest<unknown> | undefined {
  return byId.get(id);
}

export function getTilesForConnector(
  compatibleTileIds: readonly string[],
): TileManifest<unknown>[] {
  return compatibleTileIds
    .map((id) => byId.get(id))
    .filter((m): m is TileManifest<unknown> => Boolean(m));
}

/**
 * Returns the connector's adapter for the card's tile, if any. Shared tiles
 * (media-list, task-list, task-due, note-cards) dispatch render-side data
 * fetches through this lookup.
 */
export function getTileAdapter(
  card: LayoutCard,
): TileAdapter<unknown> | undefined {
  return getConnector(card.connector)?.tileAdapters?.[card.tile] as
    | TileAdapter<unknown>
    | undefined;
}

export type { TileAdapter, TileManifest } from "./types";
`;
}

function renderThemesIndex(entries: FolderEntry[]): string {
  const imports = entries
    .map((e) => `import { manifest as ${e.varName} } from "./${e.folder}/${e.manifestRel}";`)
    .join("\n");
  const arrayBody = entries.map((e) => `  ${e.varName},`).join("\n");
  return `${BANNER}//
// Source of truth: each \`app/themes/<id>/manifest.ts\` + tokens.css.
// To add a theme: copy \`_template/\`, edit the manifest + tokens, run \`pnpm gen:registries\`.
//
import type { ThemeManifest } from "./types";
${imports}

const themes: ThemeManifest[] = [
${arrayBody}
];

export function getThemes(): ThemeManifest[] {
  return themes;
}

export function getTheme(id: string): ThemeManifest | undefined {
  return themes.find((t) => t.id === id);
}

export const DEFAULT_THEME_ID = "light";
`;
}

function renderThemesCss(entries: FolderEntry[]): string {
  const imports = entries.map((e) => `@import "./${e.folder}/tokens.css";`).join("\n");
  return `${CSS_BANNER}/*
   Source of truth: each \`app/themes/<id>/tokens.css\`.
   To add a theme: copy \`_template/\`, edit tokens.css, run \`pnpm gen:registries\`.
*/
${imports}
`;
}

type GenOutput = { path: string; content: string };

function listRouteFilesUnder(absRoot: string): string[] {
  if (!existsSync(absRoot)) return [];
  const out: string[] = [];
  const stack = [absRoot];
  while (stack.length > 0) {
    const dir = stack.pop()!;
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      let s;
      try {
        s = statSync(full);
      } catch {
        continue;
      }
      if (s.isDirectory()) {
        stack.push(full);
      } else if (name === "route.ts" || name === "route.tsx") {
        out.push(full);
      }
    }
  }
  return out.sort();
}

const ROUTE_SEGMENT_CONFIG = new Set([
  "dynamic",
  "runtime",
  "revalidate",
  "fetchCache",
  "preferredRegion",
]);
const HTTP_METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]);

type ParsedRoute = {
  /** HTTP handlers that should be re-exported from the shim. */
  handlers: string[];
  /** Route-segment config consts that must be inlined verbatim in the shim
   * (Next.js / Turbopack rejects re-exports for these — they need to be
   * statically parseable in the file Next.js sees). */
  segmentConfig: { name: string; literal: string }[];
};

function parseRoute(absRouteFile: string): ParsedRoute {
  const src = readFileSync(absRouteFile, "utf8");
  const handlers = new Set<string>();
  const segmentConfig: { name: string; literal: string }[] = [];

  // `export async function GET(...)`, `export function POST(...)`
  for (const m of src.matchAll(/^export\s+(?:async\s+)?function\s+(\w+)\b/gm)) {
    if (HTTP_METHODS.has(m[1])) handlers.add(m[1]);
  }
  // `export const GET = ...` (handler) — kept as handler.
  // `export const dynamic = "force-dynamic"` — captured as segment-config literal.
  for (const m of src.matchAll(/^export\s+const\s+(\w+)\s*=\s*([^;\n]+);?$/gm)) {
    const name = m[1];
    const rhs = m[2].trim().replace(/;\s*$/, "");
    if (HTTP_METHODS.has(name)) {
      handlers.add(name);
    } else if (ROUTE_SEGMENT_CONFIG.has(name)) {
      segmentConfig.push({ name, literal: rhs });
    }
  }
  // `export { GET, POST }` re-exports — handlers only.
  for (const m of src.matchAll(/^export\s+\{([^}]+)\}/gm)) {
    for (const part of m[1].split(",")) {
      const name = part.trim().split(/\s+as\s+/).pop()!.trim();
      if (HTTP_METHODS.has(name)) handlers.add(name);
    }
  }

  const methodOrder = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];
  const sortedHandlers = methodOrder.filter((m) => handlers.has(m));
  const configOrder = ["dynamic", "runtime", "revalidate", "fetchCache", "preferredRegion"];
  segmentConfig.sort((a, b) => configOrder.indexOf(a.name) - configOrder.indexOf(b.name));

  return { handlers: sortedHandlers, segmentConfig };
}

function renderShim(connectorId: string, routeRelDir: string, parsed: ParsedRoute): string {
  const connectorRel = `@/connectors/${connectorId}/api/${routeRelDir}/route`;
  const segmentLines = parsed.segmentConfig
    .map((c) => `export const ${c.name} = ${c.literal};`)
    .join("\n");
  const reexport =
    parsed.handlers.length > 0
      ? `export { ${parsed.handlers.join(", ")} } from "${connectorRel}";`
      : "";
  return `${BANNER}//
// Source: app/connectors/${connectorId}/api/${routeRelDir}/route.ts.
// This shim only exists so the public URL stays stable; never edit here.
// Route-segment config (\`dynamic\`, etc.) is inlined because Turbopack rejects
// re-exports for those fields (they must be statically parseable in the file
// Next.js loads).
//
${segmentLines}${segmentLines ? "\n" : ""}${reexport}
`;
}

function collectShims(connectorIds: string[]): GenOutput[] {
  const shims: GenOutput[] = [];
  for (const id of connectorIds) {
    const apiAbs = join(APP_ROOT, "connectors", id, "api");
    if (!existsSync(apiAbs)) continue;
    const prefix = CONNECTOR_API_PREFIX_OVERRIDES[id] ?? id;
    const routes = listRouteFilesUnder(apiAbs);
    for (const routeAbs of routes) {
      const rel = routeAbs.slice(apiAbs.length + 1).replace(/\/route\.tsx?$/, "");
      const parsed = parseRoute(routeAbs);
      if (parsed.handlers.length === 0 && parsed.segmentConfig.length === 0) {
        throw new Error(
          `[connectors/${id}/api] route file ${routeAbs} exports no recognized HTTP methods or route-config constants. The codegen needs at least one export to write a shim.`,
        );
      }
      const shimAbs = join(APP_ROOT, "app", "api", prefix, rel, "route.ts");
      shims.push({ path: shimAbs, content: renderShim(id, rel, parsed) });
    }
  }
  return shims;
}

export function generateAll(): GenOutput[] {
  const connectors = collect("connectors");
  const tiles = collect("tiles");
  const themes = collect("themes");
  const shims = collectShims(connectors.map((c) => c.folder));
  return [
    { path: join(APP_ROOT, "connectors", "index.ts"), content: renderConnectorsIndex(connectors) },
    { path: join(APP_ROOT, "tiles", "index.ts"), content: renderTilesIndex(tiles) },
    { path: join(APP_ROOT, "themes", "index.ts"), content: renderThemesIndex(themes) },
    { path: join(APP_ROOT, "themes", "index.css"), content: renderThemesCss(themes) },
    ...shims,
  ];
}

function relativeToApp(absPath: string): string {
  return absPath.startsWith(APP_ROOT + "/") ? absPath.slice(APP_ROOT.length + 1) : absPath;
}

function main(argv: string[]): void {
  const checkOnly = argv.includes("--check");
  const outputs = generateAll();
  const drifted: { path: string; expected: string; actual: string }[] = [];

  for (const out of outputs) {
    const existing = existsSync(out.path) ? readFileSync(out.path, "utf8") : "";
    if (existing !== out.content) {
      drifted.push({ path: out.path, expected: out.content, actual: existing });
    }
  }

  if (checkOnly) {
    if (drifted.length > 0) {
      const lines = drifted.map((d) => `  - ${relativeToApp(d.path)} is out of sync with the folder layout`);
      process.stderr.write(
        `gen-registries: registry files drifted from disk state:\n${lines.join("\n")}\nRun \`pnpm gen:registries\` to regenerate, then commit the result.\n`,
      );
      process.exit(1);
    }
    process.stdout.write("gen-registries: in-sync ✓\n");
    return;
  }

  for (const out of outputs) {
    mkdirSync(dirname(out.path), { recursive: true });
    writeFileSync(out.path, out.content);
  }
  if (drifted.length > 0) {
    const lines = drifted.map((d) => `  - ${relativeToApp(d.path)}`);
    process.stdout.write(`gen-registries: regenerated:\n${lines.join("\n")}\n`);
  } else {
    process.stdout.write("gen-registries: regenerated (no changes)\n");
  }
}

function isMainModule(): boolean {
  const argv1 = process.argv[1];
  if (!argv1) return false;
  try {
    return realpathSync(fileURLToPath(import.meta.url)) === realpathSync(argv1);
  } catch {
    return false;
  }
}

if (isMainModule()) {
  try {
    main(process.argv.slice(2));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    process.stderr.write(`gen-registries: ${msg}\n`);
    process.exit(2);
  }
}
