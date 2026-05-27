import { describe, expect, it } from "vitest";
import { isPastDue, formatDueShort, labelClass } from "@/connectors/trello/_shared/utils";
import type { NormalizedTrelloCard } from "@/connectors/trello/types";

const base = (overrides: Partial<NormalizedTrelloCard> = {}): NormalizedTrelloCard => ({
  id: "x",
  name: "x",
  desc: "",
  due: null,
  dueComplete: false,
  listId: "l",
  listName: "l",
  boardId: "b",
  labels: [],
  url: "u",
  badges: { comments: 0, attachments: 0, checklistsTotal: 0, checklistsDone: 0 },
  ...overrides,
});

describe("trello utils", () => {
  it("isPastDue: false when no due date", () => {
    expect(isPastDue(base())).toBe(false);
  });

  it("isPastDue: false when dueComplete", () => {
    expect(
      isPastDue(base({ due: "2020-01-01T00:00:00Z", dueComplete: true })),
    ).toBe(false);
  });

  it("isPastDue: true when due in the past and not complete", () => {
    expect(isPastDue(base({ due: "2020-01-01T00:00:00Z" }))).toBe(true);
  });

  it("formatDueShort: same year omits year", () => {
    const now = new Date(2026, 4, 1);
    const due = new Date(2026, 4, 10).toISOString();
    expect(formatDueShort(due, now)).toBe("MAY 10");
  });

  it("formatDueShort: different year includes year", () => {
    const now = new Date(2026, 4, 1);
    const due = new Date(2027, 0, 5).toISOString();
    expect(formatDueShort(due, now)).toBe("JAN 5 2027");
  });

  it("labelClass: known color → suffix", () => {
    expect(labelClass("red")).toBe("lens-trello-label--red");
  });

  it("labelClass: null → gray", () => {
    expect(labelClass(null)).toBe("lens-trello-label--gray");
  });
});
