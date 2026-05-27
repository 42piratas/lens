import pc from "picocolors";

export const TUTORIAL_URL =
  "https://github.com/42piratas/lens/blob/main/docs/development.md";

export function fail(message) {
  process.stderr.write(`${pc.red("error")} ${message}\n`);
}

export function info(message) {
  process.stdout.write(`${pc.cyan("›")} ${message}\n`);
}

export function success(message) {
  process.stdout.write(`${pc.green("✓")} ${message}\n`);
}

export function printNextSteps({ installPath, tutorialUrl = TUTORIAL_URL }) {
  const lines = [
    "",
    pc.bold(pc.green("LENS is installed.")),
    "",
    `${pc.dim("1.")} Start the dev server:`,
    `   ${pc.cyan(`cd ${installPath}/app && pnpm dev`)}`,
    "",
    `${pc.dim("2.")} Configure your env vars by following the setup tutorial:`,
    `   ${pc.cyan(tutorialUrl)}`,
    "",
  ];
  process.stdout.write(lines.join("\n"));
}
