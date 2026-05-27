type ListResult<T> = { ok: true; data: T } | { ok: false; error: string };

export async function listExample(): Promise<ListResult<unknown[]>> {
  return { ok: true, data: [] };
}
