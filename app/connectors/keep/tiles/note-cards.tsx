"use client";

import type { TileAdapter } from "@/tiles/types";
import type { NoteCardsData } from "@/tiles/note-cards/types";
import type { KeepConfig } from "../manifest";
import { useKeepNotes } from "../hooks/use-notes";

export const noteCardsAdapter: TileAdapter<KeepConfig, NoteCardsData> = {
  useData(card) {
    const filter = card.config.filter ?? "recent";
    const label = card.config.label;
    const enabled = filter === "recent" || (filter === "label" && Boolean(label));
    const { data, isLoading, error } = useKeepNotes(
      filter === "label" ? { label } : {},
      enabled,
    );
    return {
      data: data?.map((n) => ({
        id: n.id,
        title: n.title,
        body: n.text,
        color: n.color,
      })),
      isLoading,
      error,
    };
  },
  topbarLabel: (card) => {
    if ((card.config.filter ?? "recent") === "label") {
      return card.config.label?.toUpperCase();
    }
    return "NOTES";
  },
};
