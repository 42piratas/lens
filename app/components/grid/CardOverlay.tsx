"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { useLayoutStore } from "@/lib/layout/store";
import { getConnector } from "@/connectors";
import { getTile } from "@/tiles";

export function CardOverlay({ cardId }: { cardId: string }) {
  const router = useRouter();
  const close = () => router.back();
  const card = useLayoutStore((s) => s.cards.find((c) => c.id === cardId));
  const hydrated = useLayoutStore((s) => s.hydrated);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (hydrated && !card) router.replace("/");
  }, [hydrated, card, router]);

  if (!hydrated || !card) return null;

  const manifest = getConnector(card.connector);
  const tile = getTile(card.tile);
  if (!manifest || !tile) return null;
  const Component = tile.Component;
  const label = `${manifest.name} · ${tile.label}`;

  return (
    <>
      <div
        className="lens-overlay-backdrop"
        onClick={close}
        aria-hidden
      />
      <div className="lens-overlay-panel">
        <header className="lens-overlay-header">
          <span className="lens-overlay-spacer" aria-hidden />
          <span className="tile-label flex-1 text-center truncate">{label}</span>
          <button
            type="button"
            onClick={close}
            aria-label={`Close ${label}`}
            title="Close (Esc)"
            className="lens-overlay-close"
          >
            <X size={18} strokeWidth={1.75} />
          </button>
        </header>
        <div className="lens-overlay-body">
          <Component card={card} />
        </div>
      </div>
    </>
  );
}
