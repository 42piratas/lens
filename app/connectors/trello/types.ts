export type TrelloBoard = {
  id: string;
  name: string;
  idOrganization?: string;
  closed: boolean;
};

export type TrelloList = {
  id: string;
  name: string;
  pos: number;
  closed: boolean;
};

export type TrelloLabelColor =
  | "green"
  | "yellow"
  | "orange"
  | "red"
  | "purple"
  | "blue"
  | "sky"
  | "lime"
  | "pink"
  | "black"
  | null;

export type NormalizedLabel = {
  name: string;
  color: TrelloLabelColor;
};

export type NormalizedTrelloCard = {
  id: string;
  name: string;
  desc: string;
  due: string | null;
  dueComplete: boolean;
  listId: string;
  listName: string;
  boardId: string;
  labels: NormalizedLabel[];
  url: string;
  badges: {
    comments: number;
    attachments: number;
    checklistsTotal: number;
    checklistsDone: number;
  };
};

export { IntegrationError } from "../_shared/integration-error";
export type { IntegrationErrorKind } from "../_shared/integration-error";
