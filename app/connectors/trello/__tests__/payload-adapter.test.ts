import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { tagLikeAdapter } from "@/connectors/trello/payload-adapters/tag-like";
import type { LayoutCard } from "@/connectors/types";
import type { TrelloConfig } from "@/connectors/trello/manifest";

const card: LayoutCard<TrelloConfig> = {
  id: "card-1",
  connector: "trello",
  tile: "kanban-board",
  x: 0,
  y: 0,
  w: 4,
  h: 4,
  config: { boardId: "board-abc", boardName: "Personal" },
};

describe("trello tag-like payload adapter", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("canAccept gates on boardId + non-empty name", () => {
    expect(tagLikeAdapter.canAccept(card, { kind: "tag-like", name: "OKR1" })).toBe(true);
    expect(
      tagLikeAdapter.canAccept(card, { kind: "tag-like", name: "" }),
    ).toBe(false);
    expect(
      tagLikeAdapter.canAccept(
        { ...card, config: {} },
        { kind: "tag-like", name: "OKR1" },
      ),
    ).toBe(false);
  });

  it("onAccept POSTs to /api/trello/labels with name + boardId", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(JSON.stringify({ label: { id: "lbl1" } }), { status: 200 }),
    );
    const res = await tagLikeAdapter.onAccept(
      card,
      { kind: "tag-like", name: "OKR1", color: "purple" },
      { id: "trello-card-xyz" },
    );
    expect(res).toEqual({ ok: true });
    const callArgs = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(callArgs[0]).toBe("/api/trello/labels");
    const body = JSON.parse((callArgs[1] as RequestInit).body as string);
    expect(body).toEqual({
      boardId: "board-abc",
      name: "OKR1",
      color: "purple",
      cardId: "trello-card-xyz",
    });
  });

  it("onAccept returns ok:false on API error with the error reason", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(
        JSON.stringify({ error: { kind: "auth", message: "Trello API 401" } }),
        { status: 401 },
      ),
    );
    const res = await tagLikeAdapter.onAccept(
      card,
      { kind: "tag-like", name: "OKR1" },
      { id: "trello-card-xyz" },
    );
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toContain("401");
  });

  it("onAccept returns ok:false on network failure", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("network down"),
    );
    const res = await tagLikeAdapter.onAccept(
      card,
      { kind: "tag-like", name: "OKR1" },
      { id: "trello-card-xyz" },
    );
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toContain("network down");
  });

  it("onAccept rejects when no target.id is provided", async () => {
    const res = await tagLikeAdapter.onAccept(card, {
      kind: "tag-like",
      name: "OKR1",
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toContain("specific Trello card");
  });
});
