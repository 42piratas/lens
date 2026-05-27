export type TraktItemType = "movie" | "show";

export type TraktListItem = {
  id: number;
  rank: number;
  type: TraktItemType;
  title: string;
  year?: number;
  ids: {
    trakt: number;
    imdb?: string;
    tmdb?: number;
    tvdb?: number;
    slug?: string;
  };
  link: string;
  listedAt: string;
  posterUrl?: string;
};

export type TraktListMeta = {
  username: string;
  slug: string;
  name: string;
  itemCount: number;
};

export { IntegrationError } from "../_shared/integration-error";
export type { IntegrationErrorKind } from "../_shared/integration-error";
