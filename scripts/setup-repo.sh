#!/usr/bin/env bash
# setup-repo.sh — One-time repo setup for portable worktrees.
#
# Implements principles-base.md §14 Portability — Relative-path worktrees.
# Idempotent: safe to run repeatedly. Resolves to the repo root automatically,
# so this script can live anywhere inside the repo.
#
# Each project copies this template into its own scripts/ directory and
# (when the repo has a Node package manager) wires it into the package.json
# prepare lifecycle so it runs automatically after install.
#
# Manual invocation: ./scripts/setup-repo.sh

set -euo pipefail

REQUIRED_GIT="2.48.0"

# CI / build-environment short-circuit. Portable-worktree config is a developer
# concern — irrelevant on Vercel, GitHub Actions, Netlify, Railway, etc. We
# don't want a stale `git` on a build runner to fail `pnpm install` via the
# `prepare` lifecycle hook. Detect common CI signals and exit 0 silently.
if [ "${CI:-}" = "true" ] || [ -n "${VERCEL:-}" ] || [ -n "${GITHUB_ACTIONS:-}" ] \
   || [ -n "${NETLIFY:-}" ] || [ -n "${RAILWAY_PROJECT_ID:-}" ] || [ -n "${RENDER:-}" ]; then
  exit 0
fi

if ! git rev-parse --git-dir >/dev/null 2>&1; then
  # Not in a git context (e.g. installed from a tarball) — nothing to configure. Quiet success.
  exit 0
fi

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

have_git="$(git --version | awk '{print $3}')"
lowest="$(printf '%s\n%s\n' "$REQUIRED_GIT" "$have_git" | sort -V | head -n 1)"
if [ "$lowest" != "$REQUIRED_GIT" ] && [ "$have_git" != "$REQUIRED_GIT" ]; then
  echo "WARNING: git >= $REQUIRED_GIT recommended for portable worktrees (found $have_git)." >&2
  echo "         Skipping worktree.useRelativePaths config; hooks still install." >&2
  echo "         Upgrade: brew upgrade git  (macOS)  or your platform's equivalent." >&2
  SKIP_WORKTREE_CONFIG=1
fi

if [ -z "${SKIP_WORKTREE_CONFIG:-}" ]; then
  current_format="$(git config --local --default 0 core.repositoryformatversion)"
  if [ "$current_format" = "0" ]; then
    git config core.repositoryformatversion 1
  fi

  # Setting worktree.useRelativePaths implicitly enables extensions.relativeWorktrees.
  git config worktree.useRelativePaths true

  # Convert any pre-existing worktree pointers to relative form. No-op if none.
  git worktree repair >/dev/null
fi

# Wire tracked hooks. .git/hooks/ is not versioned; .githooks/ is. The hook
# scripts themselves read .repo-class to decide whether to enforce.
#
# .githooks/ is a LIBRARY of canon-prescribed scripts — dispatcher is the repo's
# choice. If the repo already uses a richer hook dispatcher (lefthook, husky,
# pre-commit-framework), do NOT override core.hooksPath: that would silently
# disable the existing dispatcher. Instead, the repo wires the canon scripts
# into its own dispatcher (see shared-knowledge/skills/skill-git-multi-agent.md
# §Hook integration patterns for snippets).
dispatcher_present=""
if [ -f "$REPO_ROOT/lefthook.yml" ] || [ -f "$REPO_ROOT/lefthook.yaml" ]; then
  dispatcher_present="lefthook"
elif [ -d "$REPO_ROOT/.husky" ]; then
  dispatcher_present="husky"
elif [ -f "$REPO_ROOT/.pre-commit-config.yaml" ]; then
  dispatcher_present="pre-commit-framework"
fi

hooks_wiring="canon-default (core.hooksPath=.githooks)"
if [ -d "$REPO_ROOT/.githooks" ]; then
  # Ensure scripts are executable (a fresh clone may not preserve the +x bit on
  # platforms where filemode tracking is off).
  find "$REPO_ROOT/.githooks" -type f -exec chmod +x {} +

  if [ -n "$dispatcher_present" ]; then
    # Dispatcher detected. Skip core.hooksPath. If it was set previously (by an
    # earlier run of this script), unset it so the dispatcher's .git/hooks/
    # installation is no longer suppressed.
    if [ "$(git config --local --default '' core.hooksPath)" = ".githooks" ]; then
      git config --unset core.hooksPath
      echo "Unset stale core.hooksPath=.githooks (would have suppressed $dispatcher_present)."
    fi
    hooks_wiring="$dispatcher_present (wire canon scripts into $dispatcher_present — see skill-git-multi-agent.md)"
  else
    git config core.hooksPath .githooks
  fi
fi

# .repo-class is the tracked marker the hooks read. Values: canon | meta | app.
# Hooks are no-op when the file is missing.
class=""
if [ ! -f "$REPO_ROOT/.repo-class" ]; then
  echo "NOTE: $REPO_ROOT/.repo-class missing — worktree + branch-discipline hooks will not enforce." >&2
  echo "      Create the file with one of: canon | meta | app  (then re-run this script)." >&2
else
  class="$(tr -d '[:space:]' < "$REPO_ROOT/.repo-class")"
fi

# .integration-branch is the tracked marker for the protected branch (default: main).
integ_branch="main"
if [ -f "$REPO_ROOT/.integration-branch" ]; then
  integ_branch="$(tr -d '[:space:]' < "$REPO_ROOT/.integration-branch")"
elif [ -n "$class" ]; then
  echo "NOTE: $REPO_ROOT/.integration-branch missing — hooks will default to protecting 'main'." >&2
  echo "      Create the file with the integration branch name (e.g. 'main' or 'staging') to be explicit." >&2
fi

# Canon repos are single-repo by convention (no enclosing project root), so worktrees
# live at `{repo}/.worktrees/{branch}/` and must be gitignored. Idempotent.
if [ "$class" = "canon" ] && [ -f "$REPO_ROOT/.gitignore" ]; then
  if ! grep -qxE '\.worktrees/?' "$REPO_ROOT/.gitignore"; then
    printf '\n# Local worktrees (principles-base.md §14 Worktree path — single-repo)\n.worktrees/\n' \
      >> "$REPO_ROOT/.gitignore"
    echo "Added .worktrees/ to .gitignore (canon single-repo convention)."
  fi
fi

echo "Repo configured: portable worktrees + canon hook scripts ($hooks_wiring)."
echo "The workspace tree can be moved as a unit without 'git worktree repair'."
if [ -n "$dispatcher_present" ]; then
  echo "NOTE: $dispatcher_present detected. Verify lefthook.yml / .husky / .pre-commit-config.yaml"
  echo "      invokes the canon scripts at .githooks/pre-commit and .githooks/pre-push."
  echo "      Snippets: shared-knowledge/skills/skill-git-multi-agent.md §Hook integration patterns."
fi

case "$class" in
  canon|app)
    echo "Hooks: worktree-mandatory; no-direct-${integ_branch} commits; PR required to merge to ${integ_branch}."
    ;;
  meta)
    echo "Hooks: worktree-mandatory; no-direct-${integ_branch} commits; direct push to ${integ_branch} allowed (FF from feature branch)."
    ;;
esac
