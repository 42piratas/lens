import { describe, expect, it } from "vitest";
import {
  isValidLimit,
  isValidShelf,
  isValidUserId,
  shelfTitleCase,
} from "@/connectors/goodreads/_shared/utils";

describe("goodreads utils", () => {
  it("isValidUserId accepts numeric strings only", () => {
    expect(isValidUserId("12345678")).toBe(true);
    expect(isValidUserId("0")).toBe(true);
    expect(isValidUserId("")).toBe(false);
    expect(isValidUserId("abc")).toBe(false);
    expect(isValidUserId("12-name")).toBe(false);
    expect(isValidUserId("12 34")).toBe(false);
  });

  it("isValidShelf accepts lowercase letters, digits, hyphens", () => {
    expect(isValidShelf("currently-reading")).toBe(true);
    expect(isValidShelf("read")).toBe(true);
    expect(isValidShelf("2026-best-of")).toBe(true);
    expect(isValidShelf("")).toBe(false);
    expect(isValidShelf("Currently-Reading")).toBe(false);
    expect(isValidShelf("with space")).toBe(false);
    expect(isValidShelf("under_score")).toBe(false);
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

  it("shelfTitleCase title-cases hyphenated slugs", () => {
    expect(shelfTitleCase("currently-reading")).toBe("Currently Reading");
    expect(shelfTitleCase("read")).toBe("Read");
    expect(shelfTitleCase("to-read")).toBe("To Read");
    expect(shelfTitleCase("2026-best-of")).toBe("2026 Best Of");
    expect(shelfTitleCase("")).toBe("Shelf");
  });
});
