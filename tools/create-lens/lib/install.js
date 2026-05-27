import { execa } from "execa";
import { join } from "node:path";
import { REPO_URL } from "./preflight.js";

export async function cloneRepo(targetDir, { runner = execa } = {}) {
  await runner("git", ["clone", "--depth", "1", REPO_URL, targetDir], {
    stdio: "inherit",
  });
}

export async function installDeps(targetDir, { runner = execa } = {}) {
  await runner("pnpm", ["install"], {
    cwd: join(targetDir, "app"),
    stdio: "inherit",
  });
}
