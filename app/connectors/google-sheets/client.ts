import "server-only";
import { getAccessToken } from "./auth";
import { IntegrationError, type CellValue, type RangeData } from "./types";

const API = "https://sheets.googleapis.com/v4";
const CACHE_TTL_MS = 60_000;

type CacheEntry<T> = { value: T; expiresAt: number };
const rangeCache = new Map<string, CacheEntry<RangeData>>();
export type SheetMetadata = { sheets: { id: number; title: string }[] };
const metadataCache = new Map<string, CacheEntry<SheetMetadata>>();

function rangeKey(spreadsheetId: string, range: string): string {
  return `${spreadsheetId}::${range}`;
}

async function gFetch(path: string): Promise<unknown> {
  const token = await getAccessToken();
  let res: Response;
  try {
    res = await fetch(`${API}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
  } catch (err) {
    throw new IntegrationError("network", (err as Error).message);
  }
  const text = await res.text();
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      throw new IntegrationError("auth", `Sheets API ${res.status}`);
    }
    if (res.status === 429) {
      throw new IntegrationError("rate-limit", `Sheets API rate-limited`);
    }
    if (res.status === 404) {
      throw new IntegrationError("unknown", `Sheets API 404 — spreadsheet or range not found`);
    }
    throw new IntegrationError("unknown", `Sheets API ${res.status}`);
  }
  return text ? JSON.parse(text) : {};
}

function normalizeCell(raw: unknown): CellValue {
  if (raw === null || raw === undefined || raw === "") return null;
  if (typeof raw === "number") return raw;
  if (typeof raw === "string") {
    const n = Number(raw);
    if (raw.trim() !== "" && !Number.isNaN(n) && Number.isFinite(n)) return n;
    return raw;
  }
  return String(raw);
}

export async function getRange({
  spreadsheetId,
  range,
}: {
  spreadsheetId: string;
  range: string;
}): Promise<RangeData> {
  const key = rangeKey(spreadsheetId, range);
  const hit = rangeCache.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.value;

  // FORMATTED_VALUE returns whatever the cell is formatted to display:
  // dates render as date strings, currency as currency, etc. Numeric coercion
  // happens downstream (chart adapter coerceY) so unformatted numbers still
  // become numbers; date-formatted cells stop arriving as serial integers.
  const data = (await gFetch(
    `/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}?majorDimension=ROWS&valueRenderOption=FORMATTED_VALUE`,
  )) as { values?: unknown[][] };

  const values: CellValue[][] = (data.values ?? []).map((row) =>
    Array.isArray(row) ? row.map(normalizeCell) : [],
  );
  const result: RangeData = { values, majorDimension: "ROWS" };
  rangeCache.set(key, { value: result, expiresAt: Date.now() + CACHE_TTL_MS });
  return result;
}

export async function getCell({
  spreadsheetId,
  cell,
}: {
  spreadsheetId: string;
  cell: string;
}): Promise<CellValue> {
  const data = await getRange({ spreadsheetId, range: cell });
  const row = data.values[0];
  if (!row || row.length === 0) return null;
  return row[0];
}

export async function getSheetMetadata(spreadsheetId: string): Promise<SheetMetadata> {
  const hit = metadataCache.get(spreadsheetId);
  if (hit && hit.expiresAt > Date.now()) return hit.value;
  const data = (await gFetch(
    `/spreadsheets/${encodeURIComponent(spreadsheetId)}?fields=sheets.properties(sheetId,title)`,
  )) as { sheets?: { properties?: { sheetId?: number; title?: string } }[] };
  const sheets: SheetMetadata["sheets"] = (data.sheets ?? [])
    .map((s) => ({
      id: typeof s.properties?.sheetId === "number" ? s.properties.sheetId : 0,
      title: s.properties?.title ?? "",
    }))
    .filter((s) => s.title);
  const result: SheetMetadata = { sheets };
  metadataCache.set(spreadsheetId, { value: result, expiresAt: Date.now() + CACHE_TTL_MS });
  return result;
}

export function _resetSheetsCache() {
  rangeCache.clear();
  metadataCache.clear();
}
