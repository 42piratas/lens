import { existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

export const DEFAULT_DIR = "./lens";

export function resolveInstallDir(arg, { cwd = process.cwd() } = {}) {
  const requested = arg && arg.trim().length > 0 ? arg : DEFAULT_DIR;
  const absolute = resolve(cwd, requested);
  return { requested, absolute };
}

export function assertEmptyOrAbsent(absolutePath) {
  if (!existsSync(absolutePath)) return { ok: true };
  let entries;
  try {
    entries = readdirSync(absolutePath);
  } catch (err) {
    return {
      ok: false,
      message: `Cannot read target directory ${absolutePath}: ${err.message}`,
    };
  }
  if (entries.length > 0) {
    return {
      ok: false,
      message: `Target directory ${absolutePath} already exists and is not empty. Choose a different path or remove the directory first.`,
    };
  }
  return { ok: true };
}
