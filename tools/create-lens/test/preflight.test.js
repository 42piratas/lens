import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  checkNode,
  checkTool,
  preflight,
  MIN_NODE_MAJOR,
} from "../lib/preflight.js";

const successRunner = async () => ({ stdout: "ok" });
const failingRunner = async () => {
  throw new Error("ENOENT");
};

describe("checkNode", () => {
  it("passes on the current Node when ≥ MIN_NODE_MAJOR", async () => {
    const res = await checkNode({ versionString: `v${MIN_NODE_MAJOR}.0.0` });
    assert.equal(res.ok, true);
  });

  it("fails when Node is below the minimum and explains how to fix", async () => {
    const res = await checkNode({ versionString: "v18.20.0" });
    assert.equal(res.ok, false);
    assert.match(res.message, /Node\.js \d+\+ is required/);
    assert.match(res.message, /v18\.20\.0/);
  });

  it("fails when the version string is unparseable", async () => {
    const res = await checkNode({ versionString: "garbage" });
    assert.equal(res.ok, false);
  });
});

describe("checkTool", () => {
  it("passes when the runner exits cleanly", async () => {
    const res = await checkTool("git", { runner: successRunner });
    assert.equal(res.ok, true);
  });

  it("fails with a remediation hint for git when not on PATH", async () => {
    const res = await checkTool("git", { runner: failingRunner });
    assert.equal(res.ok, false);
    assert.match(res.message, /git is required/);
    assert.match(res.message, /git-scm\.com/);
  });

  it("fails with a remediation hint for pnpm when not on PATH", async () => {
    const res = await checkTool("pnpm", { runner: failingRunner });
    assert.equal(res.ok, false);
    assert.match(res.message, /pnpm is required/);
    assert.match(res.message, /pnpm\.io/);
  });

  it("uses a generic remediation for unknown tools", async () => {
    const res = await checkTool("badtool", { runner: failingRunner });
    assert.equal(res.ok, false);
    assert.match(res.message, /badtool is required/);
    assert.match(res.message, /on PATH/);
  });
});

describe("preflight aggregate", () => {
  it("returns ok when every check passes", async () => {
    const res = await preflight({
      versionString: `v${MIN_NODE_MAJOR}.0.0`,
      runner: successRunner,
    });
    assert.equal(res.ok, true);
    assert.deepEqual(res.errors, []);
  });

  it("accumulates messages from each failing check (no early return)", async () => {
    const res = await preflight({
      versionString: "v10.0.0",
      runner: failingRunner,
    });
    assert.equal(res.ok, false);
    assert.equal(res.errors.length, 3);
    assert.ok(res.errors.some((m) => /Node\.js/.test(m)));
    assert.ok(res.errors.some((m) => /git is required/.test(m)));
    assert.ok(res.errors.some((m) => /pnpm is required/.test(m)));
  });
});
