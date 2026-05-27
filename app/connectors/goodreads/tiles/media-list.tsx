"use client";

import type { TileAdapter } from "@/tiles/types";
import type { MediaListData } from "@/tiles/media-list/types";
import type { GoodreadsConfig } from "../manifest";
import { useGoodreadsShelf } from "../hooks/use-shelf";
import { shelfTitleCase } from "../_shared/utils";

export const mediaListAdapter: TileAdapter<GoodreadsConfig, MediaListData> = {
  useData(card) {
    const { userId, shelfName, limit = 20 } = card.config;
    const enabled = Boolean(userId && shelfName);
    const { data, isLoading, error } = useGoodreadsShelf(
      { userId: userId ?? "", shelfName: shelfName ?? "", limit },
      enabled,
    );
    const items = data?.books?.map((b) => ({
      id: b.id,
      title: b.title,
      subtitle: b.author,
      imageUrl: b.coverUrl,
      href: b.link,
    }));
    return {
      data: items ? { items, display: card.config.display ?? "full" } : undefined,
      isLoading,
      error,
    };
  },
  topbarLabel: (card) => shelfTitleCase(card.config.shelfName ?? "shelf"),
  topbarHref: (card) => {
    if (!card.config.userId) return undefined;
    const shelf = card.config.shelfName ?? "all";
    return `https://www.goodreads.com/review/list/${card.config.userId}?shelf=${encodeURIComponent(shelf)}`;
  },
};
