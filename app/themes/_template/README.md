# Theme template

Reference template — copy this folder to `<id>/` and:

1. Replace the `[data-theme="_template"]` selector with `[data-theme="<id>"]`.
2. Fill every required token (see `app/themes/README.md` for the complete list).
3. Update `manifest.ts` with id, label, mode, and source attribution.
4. Register in `app/themes/index.ts` and `app/themes/index.css`.
5. Run `pnpm test --run themes` — the tokens-coverage test will catch any missed tokens.

This template ships with deliberately ugly neon values (cyan / magenta / hot orange) — they exist purely to flag any token that's NOT being overridden when you wire a new theme.
