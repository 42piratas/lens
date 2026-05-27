import { execa } from "execa";

const REPO_URL = "https://github.com/42piratas/lens.git";

export const MIN_NODE_MAJOR = 20;

const TOOL_HINTS = {
  git: "install Git from https://git-scm.com/downloads",
  pnpm: "install pnpm: `npm i -g pnpm` or see https://pnpm.io/installation",
};

export async function checkNode({ versionString = process.version } = {}) {
  const major = parseInt(versionString.replace(/^v/, "").split(".")[0], 10);
  if (Number.isNaN(major) || major < MIN_NODE_MAJOR) {
    return {
      ok: false,
      message: `Node.js ${MIN_NODE_MAJOR}+ is required (found ${versionString}). Install from https://nodejs.org or via your version manager.`,
    };
  }
  return { ok: true };
}

export async function checkTool(name, { runner = execa } = {}) {
  try {
    await runner(name, ["--version"]);
    return { ok: true };
  } catch {
    const hint = TOOL_HINTS[name] ?? `install ${name} and ensure it is on PATH`;
    return {
      ok: false,
      message: `${name} is required but was not found on PATH. To fix: ${hint}.`,
    };
  }
}

export async function preflight(deps = {}) {
  const checks = [
    await checkNode(deps),
    await checkTool("git", deps),
    await checkTool("pnpm", deps),
  ];
  const failed = checks.filter((c) => !c.ok);
  return { ok: failed.length === 0, errors: failed.map((c) => c.message) };
}

export { REPO_URL };
