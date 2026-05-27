import type { CellValue } from "../types";

const SPREADSHEET_ID_RE = /^[A-Za-z0-9_-]+$/;
// Loose A1 range: optional sheet name (quoted or unquoted), then A1 spec.
// Examples: A1, B5:C20, Sheet1!A1:D20, 'My Sheet'!B5
const A1_RE = /^(?:'(?:[^']|'')+'|[A-Za-z_][A-Za-z0-9_ ]*)?!?[A-Z]+\d+(?::[A-Z]+\d+)?$/;

export function isValidSpreadsheetId(id: string): boolean {
  return SPREADSHEET_ID_RE.test(id);
}

export function isValidA1(s: string): boolean {
  return A1_RE.test(s.trim());
}

export function formatCell(v: CellValue): string {
  if (v === null) return "";
  if (typeof v === "number") {
    if (Number.isInteger(v)) return v.toLocaleString();
    return v.toLocaleString(undefined, { maximumFractionDigits: 6 });
  }
  return String(v);
}
