#!/usr/bin/env node
import { preflight } from "../lib/preflight.js";
import { resolveInstallDir, assertEmptyOrAbsent, DEFAULT_DIR } from "../lib/resolve-dir.js";
import { cloneRepo, installDeps } from "../lib/install.js";
import { fail, info, success, printNextSteps } from "../lib/output.js";

function parseArgs(argv) {
  const args = argv.slice(2);
  if (args.includes("-h") || args.includes("--help")) {
    return { mode: "help" };
  }
  if (args.includes("-v") || args.includes("--version")) {
    return { mode: "version" };
  }
  const positional = args.find((a) => !a.startsWith("-"));
  return { mode: "install", dir: positional };
}

async function readVersion() {
  const { readFile } = await import("node:fs/promises");
  const { fileURLToPath } = await import("node:url");
  const { dirname, join } = await import("node:path");
  const here = dirname(fileURLToPath(import.meta.url));
  const pkg = JSON.parse(await readFile(join(here, "..", "package.json"), "utf8"));
  return pkg.version;
}

function printHelp() {
  process.stdout.write(
    [
      "create-lens — installer for LENS",
      "",
      "Usage:",
      "  npx create-lens [dir]",
      "",
      "Arguments:",
      `  dir   Install directory (relative or absolute). Default: ${DEFAULT_DIR}`,
      "",
      "What it does:",
      "  1. Verifies Node ≥20, Git, and pnpm are on PATH.",
      "  2. git clone --depth 1 of the lens repo into <dir>.",
      "  3. pnpm install inside <dir>/app.",
      "  4. Prints next-steps and tutorial URL. Does NOT configure env vars.",
      "",
      "Options:",
      "  -h, --help     Show this help",
      "  -v, --version  Print version",
      "",
    ].join("\n"),
  );
}

async function main() {
  const args = parseArgs(process.argv);

  if (args.mode === "help") {
    printHelp();
    return 0;
  }
  if (args.mode === "version") {
    const v = await readVersion();
    process.stdout.write(`${v}\n`);
    return 0;
  }

  const pre = await preflight();
  if (!pre.ok) {
    for (const m of pre.errors) fail(m);
    return 1;
  }

  const { requested, absolute } = resolveInstallDir(args.dir);
  const dirCheck = assertEmptyOrAbsent(absolute);
  if (!dirCheck.ok) {
    fail(dirCheck.message);
    return 1;
  }

  info(`Cloning lens into ${absolute}`);
  try {
    await cloneRepo(absolute);
  } catch (err) {
    fail(`git clone failed: ${err.shortMessage || err.message}`);
    return 1;
  }
  success("Repository cloned.");

  info(`Installing dependencies in ${requested}/app`);
  try {
    await installDeps(absolute);
  } catch (err) {
    fail(`pnpm install failed: ${err.shortMessage || err.message}`);
    return 1;
  }
  success("Dependencies installed.");

  printNextSteps({ installPath: requested });
  return 0;
}

main().then(
  (code) => process.exit(code ?? 0),
  (err) => {
    fail(err.stack || err.message || String(err));
    process.exit(1);
  },
);
