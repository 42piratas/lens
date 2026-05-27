import { describe, expect, it } from "vitest";
import { getConnectors, getConnector } from "@/connectors";
import { getTile, getTiles } from "@/tiles";

describe("connector registry", () => {
  it("registers all eight connectors (Keep now first-class, Workspace-gated at runtime)", () => {
    const list = getConnectors();
    expect(list.map((c) => c.id).sort()).toEqual([
      "goodreads",
      "google-calendar",
      "google-sheets",
      "google-tasks",
      "keep",
      "scratchpad",
      "trakt",
      "trello",
    ]);
  });

  it("keep declares the note-cards tile + adapter and carries no env vars (uses Google OAuth)", () => {
    const keep = getConnector("keep");
    expect(keep).toBeDefined();
    expect(keep?.tiles).toEqual(["note-cards"]);
    expect(keep?.tileAdapters?.["note-cards"]).toBeDefined();
    expect(keep?.auth.envVars).toEqual([]);
  });

  it("google-calendar declares its four compatible tiles", () => {
    const calendar = getConnector("google-calendar");
    expect(calendar).toBeDefined();
    expect([...(calendar?.tiles ?? [])].sort()).toEqual([
      "calendar-many-weeks",
      "calendar-one-day",
      "calendar-one-month",
      "calendar-one-week",
    ]);
  });

  it("trello declares three compatible tiles + adapters for the shared ones", () => {
    const trello = getConnector("trello");
    expect(trello).toBeDefined();
    expect([...(trello?.tiles ?? [])].sort()).toEqual([
      "kanban-board",
      "task-due",
      "task-list",
    ]);
    expect(Object.keys(trello?.tileAdapters ?? {}).sort()).toEqual(["task-due", "task-list"]);
  });

  it("google-sheets declares four compatible tiles + chart and badges adapters", () => {
    const sheets = getConnector("google-sheets");
    expect(sheets).toBeDefined();
    expect([...(sheets?.tiles ?? [])].sort()).toEqual([
      "badges-with-descriptions",
      "data-chart-line",
      "data-stat",
      "data-table",
    ]);
    expect(sheets?.tileAdapters?.["data-chart-line"]).toBeDefined();
    expect(sheets?.tileAdapters?.["badges-with-descriptions"]).toBeDefined();
  });

  it("google-tasks declares two compatible tiles + adapters + Google OAuth env contract", () => {
    const tasks = getConnector("google-tasks");
    expect(tasks).toBeDefined();
    expect([...(tasks?.tiles ?? [])].sort()).toEqual(["task-due", "task-list"]);
    expect(Object.keys(tasks?.tileAdapters ?? {}).sort()).toEqual(["task-due", "task-list"]);
    expect(tasks?.auth.envVars).toEqual([
      "GOOGLE_OAUTH_CLIENT_ID",
      "GOOGLE_OAUTH_CLIENT_SECRET",
      "GOOGLE_CALENDAR_REFRESH_TOKEN",
    ]);
  });

  it("scratchpad is a local connector that maps to the note-buffer tile", () => {
    const scratchpad = getConnector("scratchpad");
    expect(scratchpad).toBeDefined();
    expect(scratchpad?.tiles).toEqual(["note-buffer"]);
    expect(scratchpad?.auth.envVars).toEqual([]);
  });

  it("goodreads + trakt both share the media-list tile via adapters", () => {
    const goodreads = getConnector("goodreads");
    const trakt = getConnector("trakt");
    expect(goodreads?.tiles).toEqual(["media-list"]);
    expect(trakt?.tiles).toEqual(["media-list"]);
    expect(goodreads?.tileAdapters?.["media-list"]).toBeDefined();
    expect(trakt?.tileAdapters?.["media-list"]).toBeDefined();
    expect(goodreads?.auth.envVars).toEqual([]);
    expect(trakt?.auth.envVars).toEqual(["TRAKT_CLIENT_ID"]);
  });

  it("returns undefined for unknown connector id", () => {
    expect(getConnector("nope")).toBeUndefined();
  });
});

describe("tile registry", () => {
  it("registers all 14 tiles (badges + 4 calendar + 3 data + kanban + media + 2 note + 2 task)", () => {
    expect(
      getTiles()
        .map((t) => t.id)
        .sort(),
    ).toEqual([
      "badges-with-descriptions",
      "calendar-many-weeks",
      "calendar-one-day",
      "calendar-one-month",
      "calendar-one-week",
      "data-chart-line",
      "data-stat",
      "data-table",
      "kanban-board",
      "media-list",
      "note-buffer",
      "note-cards",
      "task-due",
      "task-list",
    ]);
  });

  it("getTile returns the tile for a valid id", () => {
    const t = getTile("calendar-one-day");
    expect(t).toBeDefined();
    expect(t?.id).toBe("calendar-one-day");
  });

  it("getTile returns undefined for invalid id", () => {
    expect(getTile("nope")).toBeUndefined();
  });
});

