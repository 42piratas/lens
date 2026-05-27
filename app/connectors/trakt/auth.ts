// Trakt is an external connector with API-key auth — public-list reads only
// in v1. The client_id is sent as the `trakt-api-key` header on every call.
// Private-list reads require user OAuth and land with multi-user auth (b02-06).
export const auth = {
  envVars: ["TRAKT_CLIENT_ID"] as const,
  setupDoc:
    "See README — register an API app at trakt.tv/oauth/applications and copy the client_id into TRAKT_CLIENT_ID.",
};
