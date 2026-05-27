import { describe, expect, it } from "vitest";
import { formatCell, isValidA1, isValidSpreadsheetId } from "@/connectors/google-sheets/_shared/utils";

describe("isValidSpreadsheetId", () => {
  it("accepts realistic IDs", () => {
    expect(isValidSpreadsheetId("1AbC_xy-Z9")).toBe(true);
    expect(isValidSpreadsheetId("AAAAAAAAAA")).toBe(true);
  });
  it("rejects empty + bad chars", () => {
    expect(isValidSpreadsheetId("")).toBe(false);
    expect(isValidSpreadsheetId("has space")).toBe(false);
    expect(isValidSpreadsheetId("a/b")).toBe(false);
    expect(isValidSpreadsheetId("a.b")).toBe(false);
  });
});

describe("isValidA1", () => {
  it("accepts bare ranges and cells", () => {
    expect(isValidA1("A1")).toBe(true);
    expect(isValidA1("A1:D20")).toBe(true);
    expect(isValidA1("AA100:ZZ200")).toBe(true);
  });
  it("accepts sheet-qualified ranges", () => {
    expect(isValidA1("Sheet1!A1")).toBe(true);
    expect(isValidA1("Sheet1!A1:D20")).toBe(true);
    expect(isValidA1("'My Sheet'!B5")).toBe(true);
    expect(isValidA1("'My Sheet'!B5:C10")).toBe(true);
  });
  it("rejects garbage", () => {
    expect(isValidA1("")).toBe(false);
    expect(isValidA1("not-a-range")).toBe(false);
    expect(isValidA1("Sheet1!")).toBe(false);
    expect(isValidA1("123")).toBe(false);
  });
});

describe("formatCell", () => {
  it("renders null as empty string", () => {
    expect(formatCell(null)).toBe("");
  });
  it("renders integers with locale separators", () => {
    expect(formatCell(1234567)).toBe((1234567).toLocaleString());
  });
  it("renders floats with up to 6 fraction digits", () => {
    expect(formatCell(3.14159)).toBe((3.14159).toLocaleString(undefined, { maximumFractionDigits: 6 }));
  });
  it("preserves strings", () => {
    expect(formatCell("hello")).toBe("hello");
  });
});
