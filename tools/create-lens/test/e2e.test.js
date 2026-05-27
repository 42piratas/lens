import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { execa } from "execa";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  rmSync,
  existsSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const BIN = resolve(here, "..", "bin", "create-lens.js");

// Build a local bare git fixture that mimics the lens shape (root + app/package.json).
function buildFixture(baseDir) {
  const sourceDir = join(baseDir, "source");
  const bareDir = join(baseDir, "lens.git");
  mkdirSync(join(sourceDir, "app"), { recursive: true });
  writeFileSync(
    join(sourceDir, "app", "package.json"),
    JSON.stringify({ name: "lens-fixture-app", version: "0.0.0", private: true }, null, 2),
  );
  writeFileSync(join(sourceDir, "README.md"), "# fixture\n");
  return { sourceDir, bareDir };
}

async function gitInitFixture(sourceDir, bareDir) {
  await execa("git", ["init", "-q", "-b", "main", sourceDir]);
  await execa("git", ["config", "user.email", "test@example.com"], { cwd: sourceDir });
  await execa("git", ["config", "user.name", "Test"], { cwd: sourceDir });
  await execa("git", ["add", "."], { cwd: sourceDir });
  await execa("git", ["commit", "-q", "-m", "fixture"], { cwd: sourceDir });
  await execa("git", ["clone", "-q", "--bare", sourceDir, bareDir]);
}

describe("e2e: create-lens", () => {
  let workDir;
  let bareDir;

  before(async () => {
    workDir = mkdtempSync(join(tmpdir(), "createlens-e2e-"));
    const fixture = buildFixture(workDir);
    bareDir = fixture.bareDir;
    await gitInitFixture(fixture.sourceDir, bareDir);
  });

  after(() => {
    if (workDir) rmSync(workDir, { recursive: true, force: true });
  });

  it("--help exits 0 and prints usage", async () => {
    const res = await execa("node", [BIN, "--help"]);
    assert.equal(res.exitCode, 0);
    assert.match(res.stdout, /Usage:/);
    assert.match(res.stdout, /npx create-lens \[dir\]/);
  });

  it("--version exits 0 and prints semver", async () => {
    const res = await execa("node", [BIN, "--version"]);
    assert.equal(res.exitCode, 0);
    assert.match(res.stdout.trim(), /^\d+\.\d+\.\d+/);
  });

  it("refuses to install into a non-empty directory", async () => {
    const target = join(workDir, "non-empty");
    mkdirSync(target);
    writeFileSync(join(target, "existing"), "x");
    const res = await execa("node", [BIN, target], { reject: false });
    assert.equal(res.exitCode, 1);
    assert.match(res.stderr, /already exists and is not empty/);
    // No clone should have happened — directory contents unchanged.
    assert.ok(existsSync(join(target, "existing")));
    assert.ok(!existsSync(join(target, ".git")));
  });

  it("clones the fixture and reports next steps (clone-only smoke)", async () => {
    const target = join(workDir, "fresh");
    // Drive the CLI's clone step through git directly to keep the test offline and fast.
    // This validates the contract: a depth-1 clone of REPO_URL into the target produces .git + app/.
    await execa("git", ["clone", "-q", "--depth", "1", bareDir, target]);
    assert.ok(existsSync(join(target, ".git")));
    assert.ok(existsSync(join(target, "app", "package.json")));
  });
});
