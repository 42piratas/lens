const USER_ID_RE = /^\d+$/;
const SHELF_RE = /^[a-z0-9-]+$/;

export function isValidUserId(s: string): boolean {
  return USER_ID_RE.test(s);
}

export function isValidShelf(s: string): boolean {
  return SHELF_RE.test(s);
}

export function isValidLimit(n: number): boolean {
  return Number.isFinite(n) && Number.isInteger(n) && n >= 1 && n <= 50;
}

export function shelfTitleCase(slug: string): string {
  if (!slug) return "Shelf";
  return slug
    .split("-")
    .map((p) => (p.length === 0 ? p : p[0].toUpperCase() + p.slice(1)))
    .join(" ");
}
