import "server-only";
import { trelloFetch, trelloPost, trelloPut } from "./auth";
import {
  IntegrationError,
  type NormalizedLabel,
  type NormalizedTrelloCard,
  type TrelloBoard,
  type TrelloLabelColor,
  type TrelloList,
} from "./types";

const CACHE_TTL_MS = 60_000;

type CacheEntry<T> = { value: T; expiresAt: number };

let boardsCache: CacheEntry<TrelloBoard[]> | null = null;
const listsCache = new Map<string, CacheEntry<TrelloList[]>>();

const LABEL_COLORS = new Set<string>([
  "green",
  "yellow",
  "orange",
  "red",
  "purple",
  "blue",
  "sky",
  "lime",
  "pink",
  "black",
]);

function asLabelColor(raw: string | null | undefined): TrelloLabelColor {
  if (!raw) return null;
  return LABEL_COLORS.has(raw) ? (raw as TrelloLabelColor) : null;
}

export async function listBoards(): Promise<TrelloBoard[]> {
  if (boardsCache && boardsCache.expiresAt > Date.now()) return boardsCache.value;
  const data = (await trelloFetch("/members/me/boards", {
    fields: "id,name,idOrganization,closed",
    filter: "all",
  })) as Array<{
    id: string;
    name: string;
    idOrganization?: string;
    closed?: boolean;
  }>;
  const boards: TrelloBoard[] = (data ?? []).map((b) => ({
    id: b.id,
    name: b.name,
    idOrganization: b.idOrganization,
    closed: Boolean(b.closed),
  }));
  boards.sort((a, b) => a.name.localeCompare(b.name));
  boardsCache = { value: boards, expiresAt: Date.now() + CACHE_TTL_MS };
  return boards;
}

export async function listLists(boardId: string): Promise<TrelloList[]> {
  const hit = listsCache.get(boardId);
  if (hit && hit.expiresAt > Date.now()) return hit.value;
  const data = (await trelloFetch(`/boards/${boardId}/lists`, {
    fields: "id,name,pos,closed",
    filter: "all",
  })) as Array<{ id: string; name: string; pos: number; closed?: boolean }>;
  const lists: TrelloList[] = (data ?? [])
    .map((l) => ({
      id: l.id,
      name: l.name,
      pos: typeof l.pos === "number" ? l.pos : 0,
      closed: Boolean(l.closed),
    }))
    .sort((a, b) => a.pos - b.pos);
  listsCache.set(boardId, { value: lists, expiresAt: Date.now() + CACHE_TTL_MS });
  return lists;
}

type CardsArgs = {
  boardId: string;
  listIds?: string[];
  dueWithinDays?: number;
};

type RawTrelloCard = {
  id: string;
  name: string;
  desc?: string;
  due: string | null;
  dueComplete: boolean;
  idList: string;
  url: string;
  labels?: Array<{ name?: string; color?: string | null }>;
  badges?: {
    comments?: number;
    attachments?: number;
    checkItems?: number;
    checkItemsChecked?: number;
  };
};

export async function listCards(args: CardsArgs): Promise<NormalizedTrelloCard[]> {
  // No server-side caching for cards: labels and content are user-editable
  // in Trello directly, and a stale TTL would mask edits made outside LENS
  // (b02-05 follow-up: a label removed in Trello kept showing in LENS until
  // the 60s window expired). React Query's staleTime gives us de-dup.
  const lists = await listLists(args.boardId);
  const listById = new Map(lists.map((l) => [l.id, l]));

  const raw = (await trelloFetch(`/boards/${args.boardId}/cards`, {
    fields: "id,name,desc,due,dueComplete,idList,url,labels,badges",
    filter: "open",
  })) as RawTrelloCard[];

  const allowedListIds =
    args.listIds && args.listIds.length ? new Set(args.listIds) : null;

  let cards: NormalizedTrelloCard[] = (raw ?? [])
    .filter((c) => (allowedListIds ? allowedListIds.has(c.idList) : true))
    .map((c) => {
      const list = listById.get(c.idList);
      const labels: NormalizedLabel[] = (c.labels ?? []).map((l) => ({
        name: l.name ?? "",
        color: asLabelColor(l.color ?? null),
      }));
      return {
        id: c.id,
        name: c.name,
        desc: c.desc ?? "",
        due: c.due ?? null,
        dueComplete: Boolean(c.dueComplete),
        listId: c.idList,
        listName: list?.name ?? "",
        boardId: args.boardId,
        labels,
        url: c.url,
        badges: {
          comments: c.badges?.comments ?? 0,
          attachments: c.badges?.attachments ?? 0,
          checklistsTotal: c.badges?.checkItems ?? 0,
          checklistsDone: c.badges?.checkItemsChecked ?? 0,
        },
      };
    });

  if (typeof args.dueWithinDays === "number") {
    const now = Date.now();
    const horizon = now + args.dueWithinDays * 24 * 60 * 60 * 1000;
    cards = cards.filter(
      (c) => !c.dueComplete && c.due !== null && new Date(c.due).getTime() <= horizon,
    );
    cards.sort((a, b) => {
      const da = a.due ? new Date(a.due).getTime() : Number.POSITIVE_INFINITY;
      const db = b.due ? new Date(b.due).getTime() : Number.POSITIVE_INFINITY;
      return da - db;
    });
  } else {
    const listOrder = new Map(lists.map((l, i) => [l.id, i]));
    cards.sort((a, b) => {
      const la = listOrder.get(a.listId) ?? 0;
      const lb = listOrder.get(b.listId) ?? 0;
      return la - lb;
    });
  }

  return cards;
}

export function _resetTrelloCache() {
  boardsCache = null;
  listsCache.clear();
}

export type TrelloLabel = {
  id: string;
  idBoard: string;
  name: string;
  color: TrelloLabelColor;
};

const TRELLO_API_LABEL_COLORS = new Set<string>([
  "green",
  "yellow",
  "orange",
  "red",
  "purple",
  "blue",
  "sky",
  "lime",
  "pink",
  "black",
]);

/** Map a `tag-like.color` semantic name onto Trello's fixed palette. */
export function mapToTrelloColor(color: string | undefined): string | "" {
  if (!color) return "";
  return TRELLO_API_LABEL_COLORS.has(color) ? color : "";
}

export async function listBoardLabels(boardId: string): Promise<TrelloLabel[]> {
  const data = (await trelloFetch(`/boards/${boardId}/labels`, {
    fields: "id,idBoard,name,color",
    limit: "1000",
  })) as Array<{
    id: string;
    idBoard: string;
    name: string;
    color: string | null;
  }>;
  return (data ?? []).map((l) => ({
    id: l.id,
    idBoard: l.idBoard,
    name: l.name ?? "",
    color: asLabelColor(l.color ?? null),
  }));
}

/**
 * PUT a Trello card's `desc` field. Backs the b02-06 scratchpad write-back:
 * when the operator edits the bound card's body in the scratchpad and blurs
 * the textarea, the new content is PUT to `/1/cards/{id}` here.
 */
export async function updateCard(args: {
  cardId: string;
  desc: string;
}): Promise<{ id: string }> {
  if (!args.cardId.trim()) {
    throw new IntegrationError("unknown", "cardId is required");
  }
  const updated = (await trelloPut(`/cards/${args.cardId}`, {
    desc: args.desc,
  })) as { id: string };
  return { id: updated.id };
}

/** Read just the description field of a card — used by the b02-09 note-like
 *  description-append adapter to check the idempotent envelope marker. */
export async function getCardDesc(cardId: string): Promise<string> {
  if (!cardId.trim()) {
    throw new IntegrationError("unknown", "cardId is required");
  }
  const out = (await trelloFetch(`/cards/${cardId}`, { fields: "desc" })) as {
    id?: string;
    desc?: string | null;
  };
  return out?.desc ?? "";
}

/** Idempotent label create — reuse-by-name (case-insensitive) or POST a new one. */
export async function ensureBoardLabel(args: {
  boardId: string;
  name: string;
  color?: string;
}): Promise<TrelloLabel> {
  const existing = await listBoardLabels(args.boardId);
  const match = existing.find(
    (l) => l.name.toLowerCase() === args.name.toLowerCase(),
  );
  if (match) return match;
  const color = mapToTrelloColor(args.color);
  const created = (await trelloPost(`/labels`, {
    idBoard: args.boardId,
    name: args.name,
    color,
  })) as { id: string; idBoard: string; name: string; color: string | null };
  return {
    id: created.id,
    idBoard: created.idBoard,
    name: created.name,
    color: asLabelColor(created.color ?? null),
  };
}

/**
 * Idempotently attach `labelId` to a Trello card. Trello returns 400 with
 * `"that label is already on the card"` when re-applied — we treat that
 * specific case as success so retries don't loop.
 */
export async function applyLabelToCard(args: {
  cardId: string;
  labelId: string;
}): Promise<void> {
  try {
    await trelloPost(`/cards/${args.cardId}/idLabels`, { value: args.labelId });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/already on the card/i.test(msg)) return;
    throw err;
  }
}
