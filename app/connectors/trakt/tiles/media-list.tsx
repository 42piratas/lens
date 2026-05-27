"use client";

import type { TileAdapter } from "@/tiles/types";
import type { MediaListData } from "@/tiles/media-list/types";
import type { TraktConfig } from "../manifest";
import { useTraktList } from "../hooks/use-trakt-list";
import { useTraktConfigNameSync } from "../hooks/use-config-name-sync";
import { traktTopbarLabel } from "../_shared/utils";

export const mediaListAdapter: TileAdapter<TraktConfig, MediaListData> = {
  useData(card) {
    useTraktConfigNameSync(card);
    const { username, slug, limit = 20 } = card.config;
    const enabled = Boolean(username && slug);
    const { data, isLoading, error } = useTraktList(
      { username: username ?? "", slug: slug ?? "", limit },
      enabled,
    );
    const items = data?.items?.map((it) => ({
      id: String(it.id),
      title: it.title,
      subtitle: typeof it.year === "number" ? String(it.year) : undefined,
      imageUrl: it.posterUrl,
      href: it.link,
    }));
    return {
      data: items ? { items, display: card.config.display ?? "full" } : undefined,
      isLoading,
      error,
    };
  },
  topbarLabel: (card) => {
    const name = card.config.listName;
    if (name && name.length > 0) return name.toUpperCase();
    if (card.config.slug) return traktTopbarLabel(card.config.slug).toUpperCase();
    return undefined;
  },
  topbarHref: (card) => {
    if (!card.config.username || !card.config.slug) return undefined;
    return `https://trakt.tv/users/${card.config.username}/lists/${card.config.slug}`;
  },
};
