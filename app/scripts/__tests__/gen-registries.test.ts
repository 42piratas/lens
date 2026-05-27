import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, cpSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const SCRIPT = join(__dirname, "..", "gen-registries.ts");
const APP_ROOT = join(__dirname, "..", "..");

function runScript(env: Record<string, string>, args: string[] = []) {
  return spawnSync(process.execPath, ["--experimental-strip-types", SCRIPT, ...args], {
    env: { ...process.env, ...env },
    encoding: "utf8",
  });
}

/**
 * The script reads from APP_ROOT (computed at script-load time relative to the
 * file's own location). To test it against fake folders, we shadow the real
 * surfaces by creating a sibling clone with a swapped cwd is not enough — the
 * script's __dirname points to the real location. Instead these tests stage
 * synthetic surfaces in a sandbox dir and invoke the script there by
 * temporarily writing fixture folders into APP_ROOT subdirs that don't exist
 * in production (under names starting with `__test_`), then running the
 * script with an environment knob is impractical (no knob). The pragmatic
 * test here is end-to-end against the real APP_ROOT in --check mode: after
 * `pnpm gen:registries` is committed the check must always pass on a clean
 * trunk. Failure modes (missing manifest, id mismatch) are exercised against
 * a temp-tree clone using cpSync and a script wrapper.
 */

describe("gen-registries", () => {
  it("--check passes on the committed trunk (in-sync)", () => {
    const r = runScript({}, ["--check"]);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("in-sync");
  });

  it("rerunning --write produces no changes", () => {
    const before = {
      connectors: readFileSync(join(APP_ROOT, "connectors", "index.ts"), "utf8"),
      tiles: readFileSync(join(APP_ROOT, "tiles", "index.ts"), "utf8"),
      themes: readFileSync(join(APP_ROOT, "themes", "index.ts"), "utf8"),
      themesCss: readFileSync(join(APP_ROOT, "themes", "index.css"), "utf8"),
    };
    const r = runScript({});
    expect(r.status).toBe(0);
    expect(readFileSync(join(APP_ROOT, "connectors", "index.ts"), "utf8")).toBe(before.connectors);
    expect(readFileSync(join(APP_ROOT, "tiles", "index.ts"), "utf8")).toBe(before.tiles);
    expect(readFileSync(join(APP_ROOT, "themes", "index.ts"), "utf8")).toBe(before.themes);
    expect(readFileSync(join(APP_ROOT, "themes", "index.css"), "utf8")).toBe(before.themesCss);
  });
});

describe("gen-registries (sandboxed failure modes)", () => {
  let sandbox: string;
  let sandboxScript: string;

  beforeEach(() => {
    sandbox = mkdtempSync(join(tmpdir(), "gen-registries-"));
    mkdirSync(join(sandbox, "connectors"), { recursive: true });
    mkdirSync(join(sandbox, "tiles"), { recursive: true });
    mkdirSync(join(sandbox, "themes"), { recursive: true });
    mkdirSync(join(sandbox, "scripts"), { recursive: true });

    // Seed minimal valid surfaces so only the case under test mutates.
    seedConnector(sandbox, "alpha");
    seedTile(sandbox, "alpha-tile");
    seedTheme(sandbox, "alpha-theme");

    // Clone the script into the sandbox so its __dirname / APP_ROOT resolve
    // to the sandbox tree, not the real repo.
    sandboxScript = join(sandbox, "scripts", "gen-registries.ts");
    cpSync(SCRIPT, sandboxScript);
  });

  afterEach(() => {
    rmSync(sandbox, { recursive: true, force: true });
  });

  function runSandboxed(args: string[] = []) {
    return spawnSync(process.execPath, ["--experimental-strip-types", sandboxScript, ...args], {
      encoding: "utf8",
    });
  }

  it("fails when a connector folder lacks manifest.ts/.tsx", () => {
    mkdirSync(join(sandbox, "connectors", "broken"));
    const r = runSandboxed(["--check"]);
    expect(r.status).not.toBe(0);
    expect(r.stderr).toMatch(/connectors.*broken.*missing manifest/);
  });

  it("fails when a manifest id does not match the folder name", () => {
    mkdirSync(join(sandbox, "connectors", "renamed"));
    writeFileSync(
      join(sandbox, "connectors", "renamed", "manifest.tsx"),
      `export const manifest = { id: "wrong-id" };\n`,
    );
    const r = runSandboxed(["--check"]);
    expect(r.status).not.toBe(0);
    expect(r.stderr).toMatch(/manifest id "wrong-id".*does not match folder name "renamed"/);
  });

  it("fails when a theme folder lacks tokens.css", () => {
    mkdirSync(join(sandbox, "themes", "no-tokens"));
    writeFileSync(
      join(sandbox, "themes", "no-tokens", "manifest.ts"),
      `export const manifest = { id: "no-tokens" };\n`,
    );
    const r = runSandboxed(["--check"]);
    expect(r.status).not.toBe(0);
    expect(r.stderr).toMatch(/themes.*no-tokens.*missing tokens.css/);
  });

  it("--check exits non-zero when index.ts is out of sync with disk", () => {
    runSandboxed(); // initial generate
    seedConnector(sandbox, "beta"); // add a folder without re-running --write
    const r = runSandboxed(["--check"]);
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/drifted from disk state/);
  });

  it("ignores folders prefixed with _", () => {
    mkdirSync(join(sandbox, "connectors", "_internal"));
    // No manifest in _internal — must not error during write.
    expect(runSandboxed().status).toBe(0);
    // Re-running --check on the same tree should now be in-sync.
    const r = runSandboxed(["--check"]);
    expect(r.status).toBe(0);
  });
});

function seedConnector(root: string, id: string) {
  mkdirSync(join(root, "connectors", id), { recursive: true });
  writeFileSync(
    join(root, "connectors", id, "manifest.tsx"),
    `export const manifest = { id: "${id}" };\n`,
  );
}

function seedTile(root: string, id: string) {
  mkdirSync(join(root, "tiles", id), { recursive: true });
  writeFileSync(
    join(root, "tiles", id, "manifest.ts"),
    `export const manifest = { id: "${id}" };\n`,
  );
}

function seedTheme(root: string, id: string) {
  mkdirSync(join(root, "themes", id), { recursive: true });
  writeFileSync(
    join(root, "themes", id, "manifest.ts"),
    `export const manifest = { id: "${id}" };\n`,
  );
  writeFileSync(join(root, "themes", id, "tokens.css"), `[data-theme="${id}"] {}\n`);
}
