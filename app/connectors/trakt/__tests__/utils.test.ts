import { describe, expect, it } from "vitest";
import {
  isValidLimit,
  isValidSlug,
  isValidUsername,
  traktTopbarLabel,
} from "@/connectors/trakt/_shared/utils";

describe("trakt utils", () => {
  it("isValidUsername accepts lowercase + digits + underscore + hyphen", () => {
    expect(isValidUsername("42piratas")).toBe(true);
    expect(isValidUsername("alice_b")).toBe(true);
    expect(isValidUsername("a-b-c")).toBe(true);
    expect(isValidUsername("")).toBe(false);
    expect(isValidUsername("Alice")).toBe(false);
    expect(isValidUsername("with space")).toBe(false);
    expect(isValidUsername("dot.user")).toBe(false);
  });

  it("isValidSlug accepts lowercase letters, digits, hyphens", () => {
    expect(isValidSlug("watching")).toBe(true);
    expect(isValidSlug("to-watch-2026")).toBe(true);
    expect(isValidSlug("")).toBe(false);
    expect(isValidSlug("Watching")).toBe(false);
    expect(isValidSlug("with space")).toBe(false);
    expect(isValidSlug("under_score")).toBe(false);
  });

  it("isValidLimit accepts integers in [1, 50]", () => {
    expect(isValidLimit(1)).toBe(true);
    expect(isValidLimit(20)).toBe(true);
    expect(isValidLimit(50)).toBe(true);
    expect(isValidLimit(0)).toBe(false);
    expect(isValidLimit(51)).toBe(false);
    expect(isValidLimit(-1)).toBe(false);
    expect(isValidLimit(1.5)).toBe(false);
    expect(isValidLimit(NaN)).toBe(false);
  });

  it("traktTopbarLabel title-cases hyphenated slugs", () => {
    expect(traktTopbarLabel("watching")).toBe("Watching");
    expect(traktTopbarLabel("to-watch-2026")).toBe("To Watch 2026");
    expect(traktTopbarLabel("")).toBe("List");
  });
});
