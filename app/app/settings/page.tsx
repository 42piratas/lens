import type { Metadata } from "next";
import { SettingsClient } from "./SettingsClient";

export const metadata: Metadata = {
  title: "LENS | Settings",
};

export default function SettingsPage() {
  return <SettingsClient />;
}
