# create-lens

One-command installer for [LENS](https://github.com/42piratas/lens) — clones the repo and runs `pnpm install`. **Does not configure the app.** After install, follow the setup tutorial to add your env vars and OAuth credentials.

## Usage

```bash
npx create-lens [dir]
```

### The `dir` argument

`dir` is the install path. It can be **relative** (resolved against the current working directory) or **absolute**.

| Invocation | Resolves to |
|:--|:--|
| `npx create-lens` | `./lens` (default) |
| `npx create-lens my-lens` | `./my-lens` |
| `npx create-lens ./projects/lens` | `./projects/lens` |
| `npx create-lens /opt/lens` | `/opt/lens` |

If the target directory already exists and is non-empty, the installer exits with code 1 and no clone happens.

## What it does

1. Verifies `node --version` ≥ 20, `git`, and `pnpm` are on PATH. Fails fast with a one-line remediation if any is missing.
2. `git clone --depth 1` of `https://github.com/42piratas/lens.git` into `<dir>`.
3. `pnpm install` inside `<dir>/app`.
4. Prints next-steps:
   - `cd <dir>/app && pnpm dev`
   - Link to the setup tutorial.

It does **not** prompt for env vars, write `.env.local`, or install Node / pnpm / git on your behalf.

## After install

Open `<dir>/app` and follow [`docs/development.md`](https://github.com/42piratas/lens/blob/main/docs/development.md) for env-var setup, OAuth credentials, and Supabase migrations.

## Requirements

- **Node.js 20+** (Node 24 is what the app dev workflow runs on; the installer accepts 20+ so it can run from older system Node installs).
- **Git** ≥ 2.30
- **pnpm** ≥ 9
- **Windows:** use WSL2. Native Windows support is deferred to a later release.

## Options

| Flag | Behavior |
|:--|:--|
| `-h`, `--help` | Print usage and exit 0. |
| `-v`, `--version` | Print version and exit 0. |

## License

AGPL-3.0-or-later. Same license as the LENS app itself.
