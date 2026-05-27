import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clipLikeAdapter } from "@/connectors/trello/payload-adapters/clip-like";
import type { LayoutCard } from "@/connectors/types";
import type { TrelloConfig } from "@/connectors/trello/manifest";
import type { ClipLikePayload } from "@/lib/dnd-payloads/types";

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

const clip = (overrides: Partial<ClipLikePayload> = {}): ClipLikePayload => ({
  kind: "clip-like",
  label: "Refactor reflow",
  source: { connector: "trello", sourceId: "card-xyz" },
  originalContent: "edited body",
  ...overrides,
});

describe("trello clip-like payload adapter (v2 — onContentEdited)", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("canAccept always returns false (Trello does not absorb clips)", () => {
    expect(clipLikeAdapter.canAccept(card, clip())).toBe(false);
  });

  it("onAccept rejects (Trello is the source, not the target)", async () => {
    const out = await clipLikeAdapter.onAccept(card, clip());
    expect(out.ok).toBe(false);
  });

  it("onContentEdited PUTs new desc to /api/trello/cards/<id>", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(JSON.stringify({ card: { id: "card-xyz" } }), { status: 200 }),
    );
    const out = await clipLikeAdapter.onContentEdited!(card, clip({ originalContent: "new body" }));
    expect(out).toEqual({ ok: true });
    const args = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(args[0]).toBe("/api/trello/cards/card-xyz");
    expect((args[1] as RequestInit).method).toBe("PUT");
    const body = JSON.parse((args[1] as RequestInit).body as string);
    expect(body.desc).toBe("new body");
  });

  it("onContentEdited url-encodes the source card id", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response("{}", { status: 200 }),
    );
    await clipLikeAdapter.onContentEdited!(card, clip({
      source: { connector: "trello", sourceId: "id with space" },
    }));
    const args = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(args[0]).toBe("/api/trello/cards/id%20with%20space");
  });

  it("onContentEdited returns ok:false with status on API error", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(
        JSON.stringify({ error: { kind: "auth", message: "Trello API 401" } }),
        { status: 401 },
      ),
    );
    const out = await clipLikeAdapter.onContentEdited!(card, clip());
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.reason).toContain("401");
  });

  it("onContentEdited returns ok:false on network failure", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("offline"),
    );
    const out = await clipLikeAdapter.onContentEdited!(card, clip());
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.reason).toContain("offline");
  });
});
