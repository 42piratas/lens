// Goodreads is an external connector but auth-free — public-profile RSS only.
// Operator must set their Goodreads profile visibility to "Anyone (including
// people who aren't logged in to Goodreads)" — see README.
export const auth = {
  envVars: [] as const,
  setupDoc: "N/A — Goodreads public profile (see README)",
};
