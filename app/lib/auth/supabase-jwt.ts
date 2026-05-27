import "server-only";

const ALG = "HS256";
const TTL_SECONDS = 60 * 60;

function base64url(bytes: Uint8Array | string): string {
  const buf = typeof bytes === "string" ? new TextEncoder().encode(bytes) : bytes;
  let str = "";
  for (let i = 0; i < buf.length; i++) str += String.fromCharCode(buf[i]);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlDecode(input: string): ArrayBuffer {
  const pad = input.length % 4 === 0 ? 0 : 4 - (input.length % 4);
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat(pad);
  const str = atob(b64);
  const out = new ArrayBuffer(str.length);
  const view = new Uint8Array(out);
  for (let i = 0; i < str.length; i++) view[i] = str.charCodeAt(i);
  return out;
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

/**
 * Mints a Supabase-compatible access JWT signed with SUPABASE_JWT_SECRET.
 * RLS policies that call `next_auth.uid()` resolve to the `sub` claim, so
 * the same JWT scopes the client to its own row across every table.
 */
export async function signSupabaseAccessToken(userId: string): Promise<string> {
  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret) throw new Error("SUPABASE_JWT_SECRET is not set");

  const header = { alg: ALG, typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: userId,
    aud: "authenticated",
    role: "authenticated",
    iat: now,
    exp: now + TTL_SECONDS,
  };
  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const key = await hmacKey(secret);
  const sigBuf = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(signingInput),
  );
  const signature = base64url(new Uint8Array(sigBuf));
  return `${signingInput}.${signature}`;
}

/** Verify a Supabase access JWT and return its payload, or null on failure. */
export async function verifySupabaseAccessToken(
  jwt: string,
): Promise<{ sub: string; exp: number } | null> {
  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret) return null;
  const parts = jwt.split(".");
  if (parts.length !== 3) return null;
  const [encodedHeader, encodedPayload, signature] = parts;
  const key = await hmacKey(secret);
  const ok = await crypto.subtle.verify(
    "HMAC",
    key,
    base64urlDecode(signature),
    new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`),
  );
  if (!ok) return null;
  let payload: { sub?: string; exp?: number };
  try {
    payload = JSON.parse(new TextDecoder().decode(new Uint8Array(base64urlDecode(encodedPayload))));
  } catch {
    return null;
  }
  if (!payload.sub || !payload.exp) return null;
  if (payload.exp < Math.floor(Date.now() / 1000)) return null;
  return { sub: payload.sub, exp: payload.exp };
}
