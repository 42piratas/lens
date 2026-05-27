"use client";

import { usePrefsBootstrap } from "./store";

export function PrefsHydrator() {
  usePrefsBootstrap();
  return null;
}
