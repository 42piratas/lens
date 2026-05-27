/**
 * Contract test for the b02-11 pinboard RLS migration.
 *
 * This is the static contract layer (asserts the migration SQL declares
 * the right policy + RLS-enabled + service-role grant). Empirical 2-account
 * cross-user verification (the equivalent of `scripts/probe-rls-cross-user.mjs`
 * for b02-15) runs against a live Supabase and is logged in the Completion
 * Report under AC-8 — see `b02-11-pinboard-completion-report.md`.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const MIGRATION = readFileSync(
  path.resolve(__dirname, "../../../supabase/migrations/0003_pinboards.sql"),
  "utf8",
);

describe("0003_pinboards.sql RLS contract", () => {
  it("enables row-level security on public.pinboards", () => {
    expect(MIGRATION).toMatch(/alter\s+table\s+public\.pinboards\s+enable\s+row\s+level\s+security/i);
  });

  it("defines a self-only RLS policy keyed by next_auth.uid()", () => {
    expect(MIGRATION).toMatch(
      /create\s+policy\s+pinboards_self_all\s+on\s+public\.pinboards/i,
    );
    // FOR ALL gates select/insert/update/delete with the same predicate
    expect(MIGRATION).toMatch(/for\s+all\s+using\s*\(\s*next_auth\.uid\(\)\s*=\s*user_id\s*\)/i);
    expect(MIGRATION).toMatch(/with\s+check\s*\(\s*next_auth\.uid\(\)\s*=\s*user_id\s*\)/i);
  });

  it("grants service_role access for server-side paths", () => {
    expect(MIGRATION).toMatch(/grant\s+all\s+on\s+table\s+public\.pinboards\s+to\s+service_role/i);
  });

  it("defaults the state envelope to the empty pinboard shape", () => {
    expect(MIGRATION).toMatch(/"version"\s*:\s*1/);
    expect(MIGRATION).toMatch(/"enabled"\s*:\s*false/);
    expect(MIGRATION).toMatch(/"pins"\s*:\s*\[\s*\]/);
  });

  it("foreign-keys user_id to public.users with cascade delete", () => {
    expect(MIGRATION).toMatch(
      /user_id\s+uuid\s+primary\s+key\s+references\s+public\.users\(id\)\s+on\s+delete\s+cascade/i,
    );
  });
});
