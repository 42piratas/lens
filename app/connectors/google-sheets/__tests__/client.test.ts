import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { _resetSheetsCache, getCell, getRange } from "@/connectors/google-sheets/client";
import { _resetGoogleTokenCache } from "@/connectors/_shared/google-oauth";

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

const tokenResponse = () =>
  jsonResponse({ access_token: "tok", expires_in: 3600 });

describe("google-sheets client", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    process.env.GOOGLE_OAUTH_CLIENT_ID = "id";
    process.env.GOOGLE_OAUTH_CLIENT_SECRET = "secret";
    process.env.GOOGLE_CALENDAR_REFRESH_TOKEN = "refresh";
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    _resetSheetsCache();
    _resetGoogleTokenCache();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("getRange normalizes numbers and empty cells", async () => {
    fetchMock
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(
        jsonResponse({
          values: [
            ["Name", "Value"],
            ["Alpha", 42],
            ["Beta", "3.14"],
            ["Gamma", ""],
          ],
        }),
      );
    const out = await getRange({ spreadsheetId: "abc", range: "Sheet1!A1:B4" });
    expect(out.majorDimension).toBe("ROWS");
    expect(out.values).toEqual([
      ["Name", "Value"],
      ["Alpha", 42],
      ["Beta", 3.14],
      ["Gamma", null],
    ]);
  });

  it("getRange caches within TTL by spreadsheetId+range", async () => {
    fetchMock
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(jsonResponse({ values: [["a"]] }));
    await getRange({ spreadsheetId: "abc", range: "A1" });
    await getRange({ spreadsheetId: "abc", range: "A1" });
    expect(fetchMock).toHaveBeenCalledTimes(2); // 1 token + 1 sheet (second hit cached)
  });

  it("getRange separate cache keys per range", async () => {
    fetchMock
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(jsonResponse({ values: [["a"]] }))
      .mockResolvedValueOnce(jsonResponse({ values: [["b"]] }));
    await getRange({ spreadsheetId: "abc", range: "A1" });
    await getRange({ spreadsheetId: "abc", range: "B1" });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("getCell returns first row first cell or null", async () => {
    fetchMock
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(jsonResponse({ values: [[1234]] }));
    const v = await getCell({ spreadsheetId: "abc", cell: "B5" });
    expect(v).toBe(1234);
  });

  it("getCell returns null when range empty", async () => {
    fetchMock
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(jsonResponse({}));
    const v = await getCell({ spreadsheetId: "abc", cell: "Z99" });
    expect(v).toBeNull();
  });

  it("normalizes 401 to auth error and does not leak body", async () => {
    fetchMock
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => "secret-leaked-here",
      } as unknown as Response);
    await expect(getRange({ spreadsheetId: "x", range: "A1" })).rejects.toMatchObject({
      name: "IntegrationError",
      kind: "auth",
    });
    await expect(getRange({ spreadsheetId: "x", range: "A1" })).rejects.not.toMatchObject({
      message: expect.stringContaining("secret-leaked-here"),
    });
  });

  it("normalizes 429 to rate-limit error", async () => {
    fetchMock
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        text: async () => "slow down",
      } as unknown as Response);
    await expect(getRange({ spreadsheetId: "x", range: "A1" })).rejects.toMatchObject({
      name: "IntegrationError",
      kind: "rate-limit",
    });
  });

  it("normalizes 404 to unknown with helpful message", async () => {
    fetchMock
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => "not found",
      } as unknown as Response);
    await expect(getRange({ spreadsheetId: "x", range: "A1" })).rejects.toMatchObject({
      name: "IntegrationError",
      kind: "unknown",
    });
  });

  it("throws auth IntegrationError when env vars missing", async () => {
    delete process.env.GOOGLE_CALENDAR_REFRESH_TOKEN;
    await expect(getRange({ spreadsheetId: "x", range: "A1" })).rejects.toMatchObject({
      name: "IntegrationError",
      kind: "auth",
    });
  });
});
