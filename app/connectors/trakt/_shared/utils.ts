const USERNAME_RE = /^[a-z0-9_-]+$/;
const SLUG_RE = /^[a-z0-9-]+$/;

export function isValidUsername(s: string): boolean {
  return USERNAME_RE.test(s);
}

export function isValidSlug(s: string): boolean {
  return SLUG_RE.test(s);
}

export function isValidLimit(n: number): boolean {
  return Number.isFinite(n) && Number.isInteger(n) && n >= 1 && n <= 50;
}

export function traktTopbarLabel(slug: string): string {
  if (!slug) return "List";
  return slug
    .split("-")
    .map((p) => (p.length === 0 ? p : p[0].toUpperCase() + p.slice(1)))
    .join(" ");
}
