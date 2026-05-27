#!/usr/bin/env node
/**
 * Orphan-registry check.
 *
 * Catches drift in hand-maintained registries that the gen-registries
 * codegen does not own:
 *
 * 1. Workspace quick-pick icons must all exist in lucide-react. A typo
 *    or a renamed lucide icon shows up as a runtime fallback to the
 *    default — better to fail CI than silently render LayoutGrid.
 * 2. The `DragPayload` discriminated union (`types.ts`) and the
 *    `dragPayloadSchema` Zod definition (`schema.ts`) must enumerate the
 *    same `kind` literals. Adding a kind to one but not the other means
 *    payloads parse but lose their type, or compile but reject at runtime.
 *
 * The connector / tile / theme folder ↔ registry consistency is owned
 * by `pnpm gen:registries:check` and is intentionally NOT duplicated here.
 *
 * Exit code:
 *   0 — clean
 *   1 — orphan / inconsistency found (with file paths in stderr)
 *   2 — script error
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const APP_ROOT = resolve(__dirname, "..");

type Finding = { kind: "orphan" | "inconsistency"; file: string; message: string };

function parseQuickPickIcons(): string[] {
  const src = readFileSync(`${APP_ROOT}/lib/workspace/icons.ts`, "utf8");
  const match = src.match(/WORKSPACE_QUICK_PICK_ICONS\s*=\s*\[([\s\S]*?)\]/);
  if (!match) {
    throw new Error(
      "could not parse WORKSPACE_QUICK_PICK_ICONS array from app/lib/workspace/icons.ts",
    );
  }
  const list = match[1].match(/"([^"]+)"/g) ?? [];
  return list.map((s) => s.slice(1, -1));
}

function parseLucideIconNames(): Set<string> {
  // Read the keys of lucide-react's `dynamicIconImports` directly from
  // node_modules — avoids node ESM resolution gotchas with the `dynamic`
  // subpath when running via `--experimental-strip-types`.
  const src = readFileSync(
    `${APP_ROOT}/node_modules/lucide-react/dist/esm/dynamicIconImports.mjs`,
    "utf8",
  );
  const all = new Set<string>();
  for (const m of src.matchAll(/"([a-z0-9-]+)"\s*:\s*\(\)\s*=>\s*import/g)) {
    all.add(m[1]);
  }
  if (all.size < 100) {
    throw new Error(
      `expected lucide dynamicIconImports.mjs to enumerate >100 icon names, got ${all.size} — parser may be stale`,
    );
  }
  return all;
}

function checkWorkspaceIcons(): Finding[] {
  const quickPick = parseQuickPickIcons();
  const all = parseLucideIconNames();
  const findings: Finding[] = [];
  for (const name of quickPick) {
    if (!all.has(name)) {
      findings.push({
        kind: "orphan",
        file: "app/lib/workspace/icons.ts",
        message: `quick-pick icon "${name}" is not in lucide-react's iconNames — typo or renamed icon`,
      });
    }
  }
  return findings;
}

function extractKindLiterals(source: string, contextLabel: string): Set<string> {
  // Captures both:
  //   kind: "tag-like"   (Zod literal arg)
  //   kind: "tag-like";  (TS field)
  const found = new Set<string>();
  for (const m of source.matchAll(/\bkind\s*:\s*(?:z\.literal\()?\s*["']([^"']+)["']\)?/g)) {
    found.add(m[1]);
  }
  if (found.size === 0) {
    throw new Error(`${contextLabel}: no payload kind literals found — check the regex or the source`);
  }
  return found;
}

function checkPayloadKindParity(): Finding[] {
  const typesPath = `${APP_ROOT}/lib/dnd-payloads/types.ts`;
  const schemaPath = `${APP_ROOT}/lib/dnd-payloads/schema.ts`;
  const typesSrc = readFileSync(typesPath, "utf8");
  const schemaSrc = readFileSync(schemaPath, "utf8");
  const typesKinds = extractKindLiterals(typesSrc, "types.ts");
  const schemaKinds = extractKindLiterals(schemaSrc, "schema.ts");

  const findings: Finding[] = [];
  for (const k of typesKinds) {
    if (!schemaKinds.has(k)) {
      findings.push({
        kind: "inconsistency",
        file: "app/lib/dnd-payloads/schema.ts",
        message: `payload kind "${k}" is in types.ts but missing from dragPayloadSchema`,
      });
    }
  }
  for (const k of schemaKinds) {
    if (!typesKinds.has(k)) {
      findings.push({
        kind: "inconsistency",
        file: "app/lib/dnd-payloads/types.ts",
        message: `payload kind "${k}" is in schema.ts but missing from the DragPayload union in types.ts`,
      });
    }
  }
  return findings;
}

function main(): void {
  const findings: Finding[] = [];
  findings.push(...checkWorkspaceIcons());
  findings.push(...checkPayloadKindParity());

  if (findings.length === 0) {
    process.stdout.write("check-orphan-registries: clean ✓\n");
    return;
  }
  for (const f of findings) {
    process.stderr.write(`  - ${f.file}: ${f.message}\n`);
  }
  process.stderr.write(
    `check-orphan-registries: ${findings.length} ${findings.length === 1 ? "issue" : "issues"} found\n`,
  );
  process.exit(1);
}

try {
  main();
} catch (e) {
  const msg = e instanceof Error ? e.message : String(e);
  process.stderr.write(`check-orphan-registries: ${msg}\n`);
  process.exit(2);
}
