import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { noteLikeAdapter } from "@/connectors/trello/payload-adapters/note-like";
import type { LayoutCard } from "@/connectors/types";
import type { TrelloConfig } from "@/connectors/trello/manifest";
import type { NoteLikePayload } from "@/lib/dnd-payloads/types";
import {
  alreadyContainsEnvelope,
  noteEnvelope,
} from "@/lib/dnd-payloads/note-envelope";

const card: LayoutCard<TrelloConfig> = {
  id: "card-1",
  connector: "trello",
  tile: "kanban-board",
  x: 0,
  y: 0,
  w: 4,
  h: 4,
  config: { boardId: "b1" },
};

const note = (overrides: Partial<NoteLikePayload> = {}): NoteLikePayload => ({
  kind: "note-like",
  body: "Decided to ship Friday",
  source: { connector: "scratchpad", sourceId: "free" },
  ...overrides,
});

describe("trello note-like adapter — single-mode (description-append)", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("canAccept returns true for note-like payloads", () => {
    expect(noteLikeAdapter.canAccept(card, note())).toBe(true);
  });

  it("canAcceptTarget gates on target.id", () => {
    expect(noteLikeAdapter.canAcceptTarget!(card, note(), { id: "" })).toBe(false);
    expect(noteLikeAdapter.canAcceptTarget!(card, note(), { id: "card-x" })).toBe(true);
  });

  it("PUTs /api/trello/cards/<id> with descAppend = noteEnvelope(payload)", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(JSON.stringify({ card: { id: "trello-card-1" } }), { status: 200 }),
    );
    const out = await noteLikeAdapter.onAccept(card, note(), { id: "trello-card-1" });
    expect(out).toEqual({ ok: true });
    const calls = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls).toHaveLength(1);
    expect(calls[0][0]).toBe("/api/trello/cards/trello-card-1");
    expect(calls[0][1].method).toBe("PUT");
    const body = JSON.parse(calls[0][1].body);
    expect(body).toEqual({ descAppend: noteEnvelope(note()) });
  });

  it("returns ok:false when target.id is missing", async () => {
    const out = await noteLikeAdapter.onAccept(card, note(), undefined);
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.reason).toContain("target.id");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("surfaces auth failures with status in reason", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(
        JSON.stringify({ error: { kind: "auth", message: "Trello API 401" } }),
        { status: 401 },
      ),
    );
    const out = await noteLikeAdapter.onAccept(card, note(), { id: "trello-card-1" });
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.reason).toContain("401");
  });
});

describe("noteEnvelope helper", () => {
  it("renders title + body separated by a newline", () => {
    const env = noteEnvelope({ kind: "note-like", title: "T", body: "B" });
    expect(env).toBe("T\nB");
  });

  it("renders body alone when title is missing", () => {
    const env = noteEnvelope({ kind: "note-like", body: "B" });
    expect(env).toBe("B");
  });

  it("alreadyContainsEnvelope detects suffix match (idempotency)", () => {
    const payload: NoteLikePayload = { kind: "note-like", body: "B" };
    const env = noteEnvelope(payload);
    expect(alreadyContainsEnvelope(`existing\n\n${env}`, payload)).toBe(true);
    expect(alreadyContainsEnvelope(`existing\n\n${env}\n`, payload)).toBe(true);
    expect(alreadyContainsEnvelope("existing", payload)).toBe(false);
  });
});
