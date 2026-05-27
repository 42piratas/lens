"use client";

import { useEffect } from "react";
import { useLayoutStore } from "@/lib/layout/store";
import type { LayoutCard } from "../../types";
import type { TraktConfig } from "../manifest";
import { fetchTraktListMeta } from "./use-trakt-list";

export function useTraktConfigNameSync(card: LayoutCard<TraktConfig>) {
  const updateCard = useLayoutStore((s) => s.updateCard);
  const { username, slug, listName } = card.config;

  useEffect(() => {
    if (!username || !slug) return;
    let cancelled = false;
    fetchTraktListMeta(username, slug).then((res) => {
      if (cancelled) return;
      if (!res) return;
      const liveName = res.meta.name;
      if (liveName && liveName !== listName) {
        updateCard(card.id, { config: { ...card.config, listName: liveName } });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [username, slug, listName, card.id, card.config, updateCard]);
}
