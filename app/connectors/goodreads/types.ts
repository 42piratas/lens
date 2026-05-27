export type GoodreadsBook = {
  id: string;
  title: string;
  author: string;
  isbn?: string;
  coverUrl?: string;
  link: string;
  averageRating?: number;
  userRating?: number;
  addedAt: string;
  readAt?: string;
};

export type ShelfData = {
  shelfName: string;
  books: GoodreadsBook[];
};

export { IntegrationError } from "../_shared/integration-error";
export type { IntegrationErrorKind } from "../_shared/integration-error";
