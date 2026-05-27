import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { isWorkspaceDomain } from "../workspace-gate";

describe("isWorkspaceDomain", () => {
  it("returns true for non-empty domain strings", () => {
    expect(isWorkspaceDomain("acme.com")).toBe(true);
    expect(isWorkspaceDomain("example.co.uk")).toBe(true);
  });

  it("returns false for null / undefined / empty", () => {
    expect(isWorkspaceDomain(null)).toBe(false);
    expect(isWorkspaceDomain(undefined)).toBe(false);
    expect(isWorkspaceDomain("")).toBe(false);
  });
});
