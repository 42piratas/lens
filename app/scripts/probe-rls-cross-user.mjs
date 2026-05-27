import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import crypto from "node:crypto";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
const jwtSecret = process.env.SUPABASE_JWT_SECRET;
if (!url || !anon || !service || !jwtSecret) {
  console.error("Missing env vars (URL / ANON / SERVICE_ROLE / JWT_SECRET)");
  process.exit(1);
}

function b64url(buf) {
  return Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function mintJwt(sub) {
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const now = Math.floor(Date.now() / 1000);
  const payload = b64url(JSON.stringify({ sub, aud: "authenticated", role: "authenticated", iat: now, exp: now + 3600 }));
  const sig = crypto.createHmac("sha256", jwtSecret).update(`${header}.${payload}`).digest();
  return `${header}.${payload}.${b64url(sig)}`;
}

const admin = createClient(url, service, {
  db: { schema: "next_auth" },
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

console.log("URL:", url);
console.log("\n— STEP 1: list users —");
const usersRes = await admin.from("users").select("id, email").order("email");
if (usersRes.error) { console.error(usersRes.error); process.exit(1); }
const users = usersRes.data ?? [];
console.log(JSON.stringify(users, null, 2));
if (users.length < 2) {
  console.error(`\nNeed ≥2 users in next_auth.users; found ${users.length}.`);
  process.exit(1);
}
const [A, B] = users;
console.log(`\nUser A: ${A.id} (${A.email})`);
console.log(`User B: ${B.id} (${B.email})`);

const jwtA = mintJwt(A.id);
const jwtB = mintJwt(B.id);

function clientAs(jwt) {
  return createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
}
const cA = clientAs(jwtA);
const cB = clientAs(jwtB);

console.log("\n— STEP 2: ensure each user has a layout row (writes go through their own JWT — RLS-scoped) —");
for (const [label, c, u] of [["A", cA, A], ["B", cB, B]]) {
  const ins = await c.from("layouts").upsert({
    user_id: u.id,
    state: { version: 2, cards: [{ probe: true, label, ts: Date.now() }] },
  }, { onConflict: "user_id" }).select();
  console.log(`  ${label} upsert →`, ins.error ? `ERROR: ${ins.error.message}` : `${ins.data?.length ?? 0} row(s)`);
}

console.log("\n— STEP 3: cross-user reads (each JWT issues SELECT * — RLS must filter to own row) —");
const results = {};
for (const [label, c] of [["A", cA], ["B", cB]]) {
  const sel = await c.from("layouts").select("user_id, state, updated_at");
  results[label] = sel.data ?? [];
  if (sel.error) {
    console.log(`  ${label} SELECT ERROR: ${sel.error.message}`);
  } else {
    console.log(`  ${label} sees ${sel.data.length} row(s):`);
    for (const r of sel.data) console.log(`    user_id=${r.user_id}`);
  }
}

console.log("\n— STEP 4: assertions —");
const assertions = [];
function assert(name, cond, detail) {
  assertions.push({ name, ok: cond, detail });
  console.log(`  ${cond ? "PASS" : "FAIL"} · ${name}${detail ? ` — ${detail}` : ""}`);
}
assert("A sees exactly 1 row", results.A.length === 1, `actual=${results.A.length}`);
assert("B sees exactly 1 row", results.B.length === 1, `actual=${results.B.length}`);
assert("A's row.user_id == A.id", results.A[0]?.user_id === A.id, `got=${results.A[0]?.user_id}`);
assert("B's row.user_id == B.id", results.B[0]?.user_id === B.id, `got=${results.B[0]?.user_id}`);
assert("A cannot see B's row", !results.A.some((r) => r.user_id === B.id));
assert("B cannot see A's row", !results.B.some((r) => r.user_id === A.id));

console.log("\n— STEP 5: forge attempt — A tries to INSERT a layout with user_id = B.id —");
const forge = await cA.from("layouts").insert({
  user_id: B.id,
  state: { version: 2, cards: [{ forged: true }] },
}).select();
const forgeBlocked = !!forge.error;
console.log(`  forge insert →`, forge.error ? `BLOCKED (${forge.error.code}: ${forge.error.message})` : `LEAKED — ${forge.data?.length} row(s) inserted`);
assert("RLS blocks forged user_id INSERT", forgeBlocked);

console.log("\n— STEP 6: oauth_tokens cross-user check —");
const tokA = await cA.from("oauth_tokens").select("user_id, provider");
const tokB = await cB.from("oauth_tokens").select("user_id, provider");
console.log(`  A sees oauth_tokens rows: ${tokA.data?.length ?? 0}`);
console.log(`  B sees oauth_tokens rows: ${tokB.data?.length ?? 0}`);
assert("A's oauth_tokens are A-only", (tokA.data ?? []).every((r) => r.user_id === A.id));
assert("B's oauth_tokens are B-only", (tokB.data ?? []).every((r) => r.user_id === B.id));

console.log("\n— SUMMARY —");
const pass = assertions.filter((a) => a.ok).length;
const fail = assertions.length - pass;
console.log(`  ${pass}/${assertions.length} assertions PASSED${fail ? ` · ${fail} FAILED` : ""}`);
process.exit(fail === 0 ? 0 : 1);
