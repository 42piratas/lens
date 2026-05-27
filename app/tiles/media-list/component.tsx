"use client";

import type { LayoutCard } from "@/connectors/types";
import { getTileAdapter } from "..";
import {
  TileEmpty,
  TileErrorPill,
  TileSkeleton,
  TileUnconfigured,
} from "../_shared/states";
import type { MediaListData } from "./types";

export function MediaListTile({ card }: { card: LayoutCard }) {
  const adapter = getTileAdapter(card);
  if (!adapter) return null;
  const { data, isLoading, error } = adapter.useData(card) as {
    data: MediaListData | undefined;
    isLoading: boolean;
    error: unknown;
  };

  if (isLoading) return <TileSkeleton />;
  if (error) return <TileErrorPill error={error} />;
  if (!data) return <TileUnconfigured hint="Set up — gear icon" />;
  if (data.items.length === 0) return <TileEmpty hint="No items" />;

  const display = data.display ?? "full";
  // All variants render the cover; only width differs (CSS-driven via
  // data-display). "cover" hides text; "title" hides subtitle; "title-subtitle"
  // and "full" show both. Cover size scales up across the variants.
  const showCover = true;
  const showTitle = display !== "cover";
  const showSubtitle = display === "title-subtitle" || display === "full";

  return (
    <div className="lens-goodreads-list">
      <ul className="lens-goodreads-rows" data-display={display}>
        {data.items.map((item) => (
          <li key={item.id}>
            <a
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              className="lens-goodreads-row"
              data-display={display}
              title={item.title}
            >
              {showCover && (
                <span className="lens-goodreads-cover-tile" aria-hidden>
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.imageUrl}
                      alt=""
                      className="lens-goodreads-cover"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span className="lens-goodreads-cover lens-goodreads-cover--fallback" />
                  )}
                </span>
              )}
              {(showTitle || showSubtitle) && (
                <span className="lens-goodreads-text-tile">
                  {showTitle && (
                    <span className="lens-goodreads-title">{item.title}</span>
                  )}
                  {showSubtitle && item.subtitle && (
                    <span className="meta-mono lens-goodreads-author">
                      {item.subtitle}
                    </span>
                  )}
                </span>
              )}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
