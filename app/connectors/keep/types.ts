export type KeepColor =
  | "WHITE"
  | "RED"
  | "ORANGE"
  | "YELLOW"
  | "GREEN"
  | "TEAL"
  | "BLUE"
  | "DARKBLUE"
  | "PURPLE"
  | "PINK"
  | "BROWN"
  | "GRAY";

export type KeepNote = {
  id: string;
  title: string;
  text: string;
  color: KeepColor;
  pinned: boolean;
  labels: string[];
  edited: string | null;
  url: string;
};

export type KeepLabel = {
  id: string;
  name: string;
};

export { IntegrationError } from "../_shared/integration-error";
export type { IntegrationErrorKind } from "../_shared/integration-error";
