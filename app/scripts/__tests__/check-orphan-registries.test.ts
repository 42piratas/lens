import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const SCRIPT = join(__dirname, "..", "check-orphan-registries.ts");

function runScript() {
  return spawnSync(process.execPath, ["--experimental-strip-types", SCRIPT], {
    encoding: "utf8",
  });
}

describe("check-orphan-registries", () => {
  it("passes on the committed trunk (clean)", () => {
    const r = runScript();
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("clean ✓");
  });
});
