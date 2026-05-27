import { describe, expect, it } from "vitest";
import { getConnectors } from "@/connectors";
import { getTile } from "@/tiles";

/**
 * For every (connector, tile) compatibility pair where the tile is shared
 * (used by ≥2 connectors), each connector MUST register a TileAdapter.
 * Single-connector tiles may or may not use the adapter pattern — both
 * shapes are valid, so we only enforce the contract on shared tiles.
 *
 * This guards against the failure mode where a connector lists a shared
 * tile in `tiles[]` but forgets to wire the adapter — which would render
 * a blank tile at runtime instead of a build error.
 */

describe("tile adapter contract", () => {
  it("every shared tile has an adapter on every compatible connector", () => {
    const connectors = getConnectors();

    // Count how many connectors list each tile id.
    const tileUsage = new Map<string, string[]>();
    for (const c of connectors) {
      for (const t of c.tiles) {
        const list = tileUsage.get(t) ?? [];
        list.push(c.id);
        tileUsage.set(t, list);
      }
    }

    const sharedTileIds = [...tileUsage.entries()]
      .filter(([, users]) => users.length >= 2)
      .map(([tileId]) => tileId);

    for (const tileId of sharedTileIds) {
      const users = tileUsage.get(tileId) ?? [];
      for (const connectorId of users) {
        const connector = connectors.find((c) => c.id === connectorId);
        expect(
          connector?.tileAdapters?.[tileId],
          `connector "${connectorId}" lists shared tile "${tileId}" but has no adapter`,
        ).toBeDefined();
      }
    }
  });

  it("every tileAdapters key matches a registered tile", () => {
    for (const c of getConnectors()) {
      const adapterKeys = Object.keys(c.tileAdapters ?? {});
      for (const tileId of adapterKeys) {
        expect(
          getTile(tileId),
          `connector "${c.id}" registers adapter for unknown tile "${tileId}"`,
        ).toBeDefined();
      }
    }
  });

  it("every tileAdapters key is also listed in the connector's tiles[]", () => {
    for (const c of getConnectors()) {
      const adapterKeys = Object.keys(c.tileAdapters ?? {});
      for (const tileId of adapterKeys) {
        expect(
          c.tiles.includes(tileId),
          `connector "${c.id}" registers adapter for "${tileId}" but doesn't list it in tiles[]`,
        ).toBe(true);
      }
    }
  });

  it("every adapter exposes a useData function", () => {
    for (const c of getConnectors()) {
      for (const [tileId, adapter] of Object.entries(c.tileAdapters ?? {})) {
        expect(
          typeof adapter.useData,
          `connector "${c.id}" adapter for "${tileId}" has no useData`,
        ).toBe("function");
      }
    }
  });
});
