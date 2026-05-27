import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";

type UserContext = { userId: string; email: string | null };

const store = new AsyncLocalStorage<UserContext>();

export function withUser<T>(
  ctx: { userId: string; email?: string | null },
  fn: () => Promise<T> | T,
): Promise<T> {
  return Promise.resolve(
    store.run({ userId: ctx.userId, email: ctx.email ?? null }, fn),
  );
}

export function getUserIdOrNull(): string | null {
  return store.getStore()?.userId ?? null;
}

export function getUserIdOrThrow(): string {
  const id = store.getStore()?.userId;
  if (!id) {
    throw new Error("getUserIdOrThrow called outside withUser scope");
  }
  return id;
}

export function getUserEmailOrThrow(): string {
  const email = store.getStore()?.email;
  if (!email) {
    throw new Error("getUserEmailOrThrow called outside withUser scope (or session lacked an email)");
  }
  return email;
}
