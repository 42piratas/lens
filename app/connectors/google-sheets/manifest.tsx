import { Sheet } from "lucide-react";
import { z } from "zod";
import type { ConnectorManifest } from "../types";
import { ConfigBody } from "./config";
import { badgesWithDescriptionsAdapter } from "./tiles/badges-with-descriptions";
import { dataChartLineAdapter } from "./tiles/data-chart-line";

export const ConfigSchema = z.object({
  spreadsheetId: z.string().regex(/^[A-Za-z0-9_-]+$/).optional(),
  range: z.string().optional(),
  cell: z.string().optional(),
  label: z.string().optional(),
  treatFirstRowAsHeader: z.boolean().optional(),
  reverseRows: z.boolean().optional(),
});
export type GoogleSheetsConfig = z.infer<typeof ConfigSchema>;

export const manifest: ConnectorManifest<GoogleSheetsConfig> = {
  id: "google-sheets",
  name: "Google Sheets",
  icon: <Sheet size={16} strokeWidth={1.75} aria-hidden />,
  description:
    "Read-only views of a Google Sheet (table, single stat, line chart, badges + descriptions).",
  auth: {
    envVars: [
      "GOOGLE_OAUTH_CLIENT_ID",
      "GOOGLE_OAUTH_CLIENT_SECRET",
      "GOOGLE_CALENDAR_REFRESH_TOKEN",
    ],
    setupDoc: "./README.md",
  },
  configSchema: ConfigSchema,
  defaultConfig: () => ({ treatFirstRowAsHeader: true }),
  tiles: ["data-table", "data-stat", "data-chart-line", "badges-with-descriptions"],
  tileAdapters: {
    "data-chart-line": dataChartLineAdapter,
    "badges-with-descriptions": badgesWithDescriptionsAdapter,
  },
  ConfigBody,
};
