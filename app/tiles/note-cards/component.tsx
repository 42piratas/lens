"use client";

import type { LayoutCard } from "@/connectors/types";
import { getTileAdapter } from "..";
import {
  TileEmpty,
  TileErrorPill,
  TileSkeleton,
  TileUnconfigured,
} from "../_shared/states";
import type { NoteCardsData } from "./types";

export function NoteCardsTile({ card }: { card: LayoutCard }) {
  const adapter = getTileAdapter(card);
  if (!adapter) return null;
  const { data, isLoading, error } = adapter.useData(card) as {
    data: NoteCardsData | undefined;
    isLoading: boolean;
    error: unknown;
  };

  if (isLoading) return <TileSkeleton />;
  if (error) return <TileErrorPill error={error} />;
  if (!data) return <TileUnconfigured hint="Set up — gear icon" />;
  if (data.length === 0) return <TileEmpty hint="No notes" />;

  return (
    <div className="lens-keep-list">
      {data.map((note) => (
        <article
          key={note.id}
          className={`lens-keep-note${note.color ? ` lens-keep-note--${note.color}` : ""}`}
        >
          {note.title && (
            <h3 className="lens-keep-note-title card-text">{note.title}</h3>
          )}
          {note.body && (
            <p className="lens-keep-note-body card-text">{note.body}</p>
          )}
        </article>
      ))}
    </div>
  );
}
