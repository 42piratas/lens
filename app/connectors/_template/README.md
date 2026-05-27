# Example connector — template

Reference template for adding a new connector. The leading underscore in `_template/` excludes this folder from the runtime registry.

## Structure

```
_template/
  manifest.ts   single export declaring id, modes, configSchema, ConfigBody
  auth.ts       server-side auth helper, reads process.env.* only
  client.ts     source adapter (cached listX functions, normalized error envelope)
  config.tsx    connector-specific body for the universal card-config panel
  modes/        one renderer file per view mode
  README.md     this file — operator setup + required env vars + scopes
```

## Required env vars

| Var | Purpose |
|:----|:--------|
| `EXAMPLE_API_KEY` | Authenticates against the Example API. |

Add to `.env.local` only. Never commit secrets.

## Scopes / permissions

Document any third-party OAuth scopes or API permissions the operator must grant.

## Adding a new connector

1. Copy `_template/` to `<your-connector-id>/` (lowercase, kebab-case, no leading underscore).
2. Update `manifest.ts` with your `id`, `name`, `icon`, `description`, `configSchema`, and `modes`.
3. Implement `auth.ts`, `client.ts`, mode components, and `ConfigBody`.
4. Register the manifest in `app/connectors/index.ts` (push onto the `manifests` array).
5. Document required env vars + scopes in this connector's `README.md`.
