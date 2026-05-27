/**
 * AC-5 — pin click target opens in a new tab with `rel="noopener noreferrer"`.
 *
 * The project does not ship react-testing-library or jsdom; introducing them
 * just to verify a static attribute set isn't worth the build-graph cost.
 * Instead, this test reads the component source and asserts the anchor's
 * security attributes are present verbatim. If the component is rewritten
 * to e.g. use `<button>` + JS `window.open`, this test will fail and force
 * an explicit re-verification.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const SOURCE = readFileSync(path.resolve(__dirname, "../Pinboard.tsx"), "utf8");

describe("Pinboard component — click-target contract (AC-5)", () => {
  it("renders pin rows as anchors with href, target=_blank, and rel=noopener noreferrer", () => {
    // PinRow is a tagged template-literal-free JSX block; the relevant lines
    // live inside the file as raw source.
    expect(SOURCE).toMatch(/<a[\s\S]*?href={pin\.url}/);
    expect(SOURCE).toMatch(/target="_blank"/);
    expect(SOURCE).toMatch(/rel="noopener noreferrer"/);
  });

  it("PinRow uses useSortable for drag-to-reorder wiring", () => {
    // Sanity: AC-7 reorder behavior is exercised at the store level (see
    // lib/pinboard/__tests__/store.test.ts), but the row must opt in to the
    // sortable context for drag-end events to fire.
    expect(SOURCE).toMatch(/useSortable\(\s*\{[^}]*id:\s*pin\.id/);
  });
});
