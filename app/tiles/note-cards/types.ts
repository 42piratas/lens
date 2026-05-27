export type NoteItem = {
  id: string;
  title?: string;
  body?: string;
  /** Connector-specific accent token; tile renders `lens-keep-note--<color>` when present. */
  color?: string;
};

export type NoteCardsData = NoteItem[];
