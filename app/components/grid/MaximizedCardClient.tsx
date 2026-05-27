"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLayoutStore } from "@/lib/layout/store";
import { getTile } from "@/tiles";
import { EscBackHandler } from "@/components/shell/EscBackHandler";

export function MaximizedCardClient({ cardId }: { cardId: string }) {
  const router = useRouter();
  const card = useLayoutStore((s) => s.cards.find((c) => c.id === cardId));
  const hydrated = useLayoutStore((s) => s.hydrated);

  useEffect(() => {
    if (!hydrated) return;
    if (!card) router.replace("/");
  }, [hydrated, card, router]);

  if (!hydrated || !card) {
    return (
      <div className="lens-maximize-loading">
        <span className="meta-mono">Loading…</span>
      </div>
    );
  }

  const tile = getTile(card.tile);
  if (!tile) return null;
  const Component = tile.Component;

  return (
    <div className="lens-maximize-shell">
      <EscBackHandler />
      <div className="tile lens-maximize-tile">
        <Component card={card} />
      </div>
    </div>
  );
}
