import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const LIGHT_PICK_KEY = "lens.theme.light";
const DARK_PICK_KEY = "lens.theme.dark";

const storage = new Map<string, string>();
const fakeWindow = {
  localStorage: {
    getItem: (k: string) => storage.get(k) ?? null,
    setItem: (k: string, v: string) => {
      storage.set(k, v);
    },
    removeItem: (k: string) => {
      storage.delete(k);
    },
    clear: () => storage.clear(),
  },
};

const docState = { attrs: new Map<string, string>() };
const fakeDocument = {
  documentElement: {
    setAttribute(name: string, value: string) {
      docState.attrs.set(name, value);
    },
    getAttribute(name: string) {
      return docState.attrs.get(name) ?? null;
    },
  },
};

beforeAll(() => {
  vi.stubGlobal("window", fakeWindow);
  vi.stubGlobal("document", fakeDocument);
});

beforeEach(() => {
  storage.clear();
  docState.attrs.clear();
  vi.resetModules();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("theme store — per-mode preference setters (b02-10)", () => {
  it("setLightPreference updates light pick without flipping active when active is dark", async () => {
    const { useThemeStore } = await import("../store");
    // Force active to dark
    useThemeStore.getState().setTheme("dark");
    expect(useThemeStore.getState().theme).toBe("dark");

    useThemeStore.getState().setLightPreference("catppuccin-latte");
    const s = useThemeStore.getState();
    expect(s.lightThemeId).toBe("catppuccin-latte");
    expect(s.theme).toBe("dark"); // unchanged
    expect(storage.get(LIGHT_PICK_KEY)).toBe("catppuccin-latte");
  });

  it("setLightPreference activates the chosen theme when active is already light", async () => {
    const { useThemeStore } = await import("../store");
    useThemeStore.getState().setTheme("light");
    useThemeStore.getState().setLightPreference("solarized-light");
    const s = useThemeStore.getState();
    expect(s.lightThemeId).toBe("solarized-light");
    expect(s.theme).toBe("solarized-light");
    expect(docState.attrs.get("data-theme")).toBe("solarized-light");
  });

  it("setDarkPreference updates dark pick without flipping active when active is light", async () => {
    const { useThemeStore } = await import("../store");
    useThemeStore.getState().setTheme("light");
    useThemeStore.getState().setDarkPreference("tokyo-night");
    const s = useThemeStore.getState();
    expect(s.darkThemeId).toBe("tokyo-night");
    expect(s.theme).toBe("light");
    expect(storage.get(DARK_PICK_KEY)).toBe("tokyo-night");
  });

  it("setDarkPreference activates the chosen theme when active is already dark", async () => {
    const { useThemeStore } = await import("../store");
    useThemeStore.getState().setTheme("dark");
    useThemeStore.getState().setDarkPreference("dracula");
    const s = useThemeStore.getState();
    expect(s.darkThemeId).toBe("dracula");
    expect(s.theme).toBe("dracula");
  });

  it("setLightPreference rejects a dark-mode theme id", async () => {
    const { useThemeStore } = await import("../store");
    const before = useThemeStore.getState().lightThemeId;
    useThemeStore.getState().setLightPreference("dark");
    expect(useThemeStore.getState().lightThemeId).toBe(before);
  });

  it("setDarkPreference rejects a light-mode theme id", async () => {
    const { useThemeStore } = await import("../store");
    const before = useThemeStore.getState().darkThemeId;
    useThemeStore.getState().setDarkPreference("light");
    expect(useThemeStore.getState().darkThemeId).toBe(before);
  });
});
