import { z } from "zod";
import type { ConnectorManifest } from "../types";
import { ConfigBody } from "./config";

const ConfigSchema = z.object({
  example: z.string(),
});
type Config = z.infer<typeof ConfigSchema>;

export const manifest: ConnectorManifest<Config> = {
  id: "example",
  name: "Example Connector",
  icon: null,
  description: "Reference template for new connectors. Excluded from runtime registry.",
  auth: {
    envVars: ["EXAMPLE_API_KEY"],
    setupDoc: "./README.md",
  },
  configSchema: ConfigSchema,
  defaultConfig: () => ({ example: "" }),
  tiles: ["example"],
  ConfigBody,
};
