import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const store = vi.hoisted(() => ({
  existing: null as unknown,
  upserts: [] as unknown[],
  deletes: 0,
}));

class QB {
  select() {
    return this;
  }
  eq() {
    return this;
  }
  upsert(obj: unknown) {
    store.upserts.push(obj);
    return Promise.resolve({ error: null });
  }
  delete() {
    store.deletes += 1;
    return this;
  }
  maybeSingle() {
    return Promise.resolve({ data: store.existing, error: null });
  }
  single() {
    return Promise.resolve({ data: store.existing, error: null });
  }
  // Makes `await from().delete().eq().eq()` resolve.
  then(resolve: (v: { error: null }) => unknown) {
    return Promise.resolve({ error: null }).then(resolve);
  }
}

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: () => ({ from: () => new QB() }),
}));

const vault = vi.hoisted(() => ({
  create: vi.fn(async () => "sec-access"),
  update: vi.fn(async () => {}),
  read: vi.fn(async () => "ght"),
  del: vi.fn(async () => {}),
}));

vi.mock("@/lib/supabase/vault", () => ({
  vaultCreateSecret: vault.create,
  vaultUpdateSecret: vault.update,
  vaultReadSecret: vault.read,
  vaultDeleteSecret: vault.del,
}));

import {
  deleteOAuthTokens,
  persistOAuthTokens,
  readOAuthTokens,
} from "@/lib/auth/persist-oauth-tokens";

beforeEach(() => {
  store.existing = null;
  store.upserts = [];
  store.deletes = 0;
  vault.create.mockClear();
  vault.read.mockClear();
  vault.del.mockClear();
});
afterEach(() => vi.clearAllMocks());

describe("github connection token persistence", () => {
  it("persists a github token via vault and upserts under provider 'github'", async () => {
    await persistOAuthTokens({
      userId: "u1",
      provider: "github",
      accessToken: "ght",
      refreshToken: null,
      expiresAt: null,
      scopes: [],
    });
    expect(vault.create).toHaveBeenCalledWith("ght", "oauth.github.access.u1");
    expect(store.upserts[0]).toMatchObject({
      user_id: "u1",
      provider: "github",
      access_token_secret_id: "sec-access",
    });
  });

  it("reads back the decrypted github token", async () => {
    store.existing = {
      access_token_secret_id: "sec-access",
      refresh_token_secret_id: null,
      expires_at: null,
      scopes: [],
    };
    const r = await readOAuthTokens({ userId: "u1", provider: "github" });
    expect(r?.accessToken).toBe("ght");
  });

  it("delete erases the vault secret and the row", async () => {
    store.existing = {
      access_token_secret_id: "sec-access",
      refresh_token_secret_id: null,
    };
    await deleteOAuthTokens({ userId: "u1", provider: "github" });
    expect(vault.del).toHaveBeenCalledWith("sec-access");
    expect(store.deletes).toBe(1);
  });
});
