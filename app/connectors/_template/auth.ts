export function getApiKey(): string {
  const key = process.env.EXAMPLE_API_KEY;
  if (!key) throw new Error("EXAMPLE_API_KEY is not set in .env.local");
  return key;
}
