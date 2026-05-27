import type { LayoutCard } from "@/connectors/types";

type Config = { example?: string };

export function ExampleTile({ card }: { card: LayoutCard<Config> }) {
  return (
    <div className="tile">
      <div className="tile-label">Example tile</div>
      <div className="card-text mt-1">Config: {card.config.example ?? "(empty)"}</div>
    </div>
  );
}
