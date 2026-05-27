export const MEDIA_DISPLAY_OPTIONS = [
  "title",
  "title-subtitle",
  "full",
  "cover",
] as const;
export type MediaDisplay = (typeof MEDIA_DISPLAY_OPTIONS)[number];

export type MediaItem = {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl?: string;
  href?: string;
};

export type MediaListData = {
  items: MediaItem[];
  display?: MediaDisplay;
};
