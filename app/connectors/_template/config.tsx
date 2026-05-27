import type { ComponentType } from "react";
import type { TileManifest } from "@/tiles/types";

type Config = { example: string };

export const ConfigBody: ComponentType<{
  config: Config;
  tile: TileManifest<Config>;
  onChange: (next: Config) => void;
}> = ({ config, onChange }) => {
  return (
    <label className="flex flex-col gap-1">
      <span className="tile-label">Example field</span>
      <input
        type="text"
        value={config.example}
        onChange={(e) => onChange({ ...config, example: e.target.value })}
        className="rounded-md px-3 py-2 outline-none border border-(--border) bg-(--surface-muted) text-(--fg)"
      />
    </label>
  );
};
