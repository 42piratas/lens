import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, isAbsolute } from "node:path";
import {
  resolveInstallDir,
  assertEmptyOrAbsent,
  DEFAULT_DIR,
} from "../lib/resolve-dir.js";

describe("resolveInstallDir", () => {
  it("defaults to ./lens when no arg is given", () => {
    const res = resolveInstallDir(undefined, { cwd: "/tmp/x" });
    assert.equal(res.requested, DEFAULT_DIR);
    assert.equal(res.absolute, "/tmp/x/lens");
    assert.ok(isAbsolute(res.absolute));
  });

  it("treats an empty string as the default", () => {
    const res = resolveInstallDir("", { cwd: "/tmp/x" });
    assert.equal(res.requested, DEFAULT_DIR);
  });

  it("resolves a relative path against cwd", () => {
    const res = resolveInstallDir("./my-lens", { cwd: "/tmp/x" });
    assert.equal(res.requested, "./my-lens");
    assert.equal(res.absolute, "/tmp/x/my-lens");
  });

  it("preserves an absolute path", () => {
    const res = resolveInstallDir("/opt/lens", { cwd: "/tmp/x" });
    assert.equal(res.absolute, "/opt/lens");
  });
});

describe("assertEmptyOrAbsent", () => {
  it("passes when the directory does not exist", () => {
    const base = mkdtempSync(join(tmpdir(), "createlens-"));
    const target = join(base, "missing");
    try {
      assert.equal(assertEmptyOrAbsent(target).ok, true);
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  });

  it("passes when the directory exists but is empty", () => {
    const base = mkdtempSync(join(tmpdir(), "createlens-"));
    try {
      assert.equal(assertEmptyOrAbsent(base).ok, true);
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  });

  it("fails when the directory exists and is non-empty", () => {
    const base = mkdtempSync(join(tmpdir(), "createlens-"));
    try {
      writeFileSync(join(base, "a"), "x");
      const res = assertEmptyOrAbsent(base);
      assert.equal(res.ok, false);
      assert.match(res.message, /already exists and is not empty/);
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  });
});
