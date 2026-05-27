<!--
  Thanks for contributing to LENS. Please fill out the sections below.
  Trim or remove any that don't apply, but don't delete the headings.
-->

## Summary

<!-- One or two sentences describing what this PR does and why. -->

## Linked issue

<!-- Closes #123 / Refs #456 / N/A -->

## Surface

<!-- Which of the five modular surfaces does this touch? Tick all that apply. -->

- [ ] Connector (`app/connectors/<id>/`)
- [ ] Tile (`app/tiles/<id>/`)
- [ ] Theme (`app/themes/<id>/`)
- [ ] Workspace (`app/lib/workspace/`)
- [ ] Plugin / drag-payload (`app/lib/dnd-payloads/` or `connectors/*/payload-adapters/`)
- [ ] Shell / chrome (Dock, settings, routing, auth)
- [ ] Docs / tooling / CI
- [ ] Other:

## Checklist

- [ ] `pnpm typecheck` passes
- [ ] `pnpm lint` passes
- [ ] `pnpm test --run` passes
- [ ] `pnpm gen:registries:check` passes (if a connector / tile / theme folder was added or removed)
- [ ] Updated docs (`docs/`, `README.md`, connector / tile / theme `README.md`) where relevant
- [ ] No secrets, OAuth tokens, or `.env*` files committed

## Screenshots / video

<!-- Required for any visible UI change. Drag images here or paste a video URL. -->

## Notes for reviewers

<!-- Anything reviewers should pay extra attention to, known limitations, follow-ups. -->
