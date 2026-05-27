"use client";

import { useEffect } from "react";
import type { TileManifest } from "@/tiles/types";
import type { TrelloConfig } from "./manifest";
import { useTrelloBoards } from "./hooks/use-boards";
import { useTrelloLists } from "./hooks/use-lists";

type Props = {
  config: TrelloConfig;
  tile: TileManifest<TrelloConfig>;
  onChange: (next: TrelloConfig) => void;
};

export function ConfigBody({ config, tile, onChange }: Props) {
  const isList = tile.id === "task-list";
  const isBoard = tile.id === "kanban-board";
  const isDue = tile.id === "task-due";

  const { data: boardsRaw, isLoading: loadingBoards, error: boardsError } = useTrelloBoards();
  const boards = (boardsRaw ?? []).filter((b) => !b.closed);

  const { data: listsRaw, isLoading: loadingLists, error: listsError } = useTrelloLists(
    config.boardId,
  );
  const lists = (listsRaw ?? []).filter((l) => !l.closed);

  const set = <K extends keyof TrelloConfig>(key: K, value: TrelloConfig[K]) => {
    onChange({ ...config, [key]: value });
  };

  const handleBoardChange = (boardId: string) => {
    const board = boards.find((b) => b.id === boardId);
    onChange({
      boardId: boardId || undefined,
      boardName: board?.name,
      listId: undefined,
      listName: undefined,
      listIds: undefined,
      dueWithinDays: config.dueWithinDays,
    });
  };

  const handleListChange = (listId: string | undefined) => {
    const l = listId ? lists.find((x) => x.id === listId) : undefined;
    onChange({ ...config, listId, listName: l?.name });
  };

  useEffect(() => {
    if (isList && config.listId) {
      const stillValid = lists.some((l) => l.id === config.listId);
      if (!stillValid && !loadingLists && !listsError && config.boardId) {
        onChange({ ...config, listId: undefined, listName: undefined });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tile.id, lists.length, loadingLists, config.boardId]);

  const dueWithin = config.dueWithinDays ?? 7;

  return (
    <div className="lens-panel-fields">
      <label className="lens-panel-field">
        <span className="tile-label">Board</span>
        {loadingBoards ? (
          <span className="meta-mono lens-panel-field-loading">Loading…</span>
        ) : boardsError ? (
          <span className="meta-mono lens-panel-field-error">Couldn&apos;t load boards</span>
        ) : (
          <select
            value={config.boardId ?? ""}
            onChange={(e) => handleBoardChange(e.target.value)}
            className="lens-panel-select"
          >
            <option value="" disabled>
              Pick a board…
            </option>
            {boards.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        )}
      </label>

      {isList && config.boardId && (
        <label className="lens-panel-field">
          <span className="tile-label">List</span>
          {loadingLists ? (
            <span className="meta-mono lens-panel-field-loading">Loading…</span>
          ) : listsError ? (
            <span className="meta-mono lens-panel-field-error">Couldn&apos;t load lists</span>
          ) : (
            <select
              value={config.listId ?? ""}
              onChange={(e) => handleListChange(e.target.value || undefined)}
              className="lens-panel-select"
            >
              <option value="" disabled>
                Pick a list…
              </option>
              {lists.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          )}
        </label>
      )}

      {isBoard && config.boardId && (
        <div className="lens-panel-field">
          <span className="tile-label">Lists</span>
          {loadingLists ? (
            <span className="meta-mono lens-panel-field-loading">Loading…</span>
          ) : listsError ? (
            <span className="meta-mono lens-panel-field-error">Couldn&apos;t load lists</span>
          ) : (
            <ListMultiSelect
              all={lists.map((l) => ({ id: l.id, name: l.name }))}
              selected={config.listIds}
              onChange={(ids) => set("listIds", ids && ids.length ? ids : undefined)}
            />
          )}
        </div>
      )}

      {isDue && (
        <label className="lens-panel-field">
          <span className="tile-label">Window</span>
          <span className="meta-mono lens-panel-field-helper">{dueWithin} days</span>
          <input
            type="range"
            min={1}
            max={60}
            step={1}
            value={dueWithin}
            onChange={(e) => set("dueWithinDays", Number(e.target.value))}
            className="lens-panel-range"
          />
        </label>
      )}
    </div>
  );
}

function ListMultiSelect({
  all,
  selected,
  onChange,
}: {
  all: { id: string; name: string }[];
  selected: string[] | undefined;
  onChange: (ids: string[]) => void;
}) {
  const isAll = !selected || selected.length === 0;
  const toggle = (id: string) => {
    const current = selected && selected.length ? selected : all.map((l) => l.id);
    const next = current.includes(id)
      ? current.filter((x) => x !== id)
      : [...current, id];
    if (next.length === all.length) {
      onChange([]);
      return;
    }
    onChange(next);
  };
  return (
    <div className="lens-trello-multilist">
      <button
        type="button"
        className="lens-panel-segmented-btn"
        data-active={isAll ? "true" : undefined}
        onClick={() => onChange([])}
      >
        All
      </button>
      {all.map((l) => {
        const active = isAll || (selected ?? []).includes(l.id);
        return (
          <button
            key={l.id}
            type="button"
            className="lens-panel-segmented-btn"
            data-active={active ? "true" : undefined}
            onClick={() => toggle(l.id)}
            title={l.name}
          >
            {l.name}
          </button>
        );
      })}
    </div>
  );
}
