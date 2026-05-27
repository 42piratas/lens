import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

console.log("\n— public.users —");
console.log(JSON.stringify(await supabase.from("users").select("id, email, name"), null, 2));

console.log("\n— next_auth.users —");
const naUsers = createClient(url, key, {
  db: { schema: "next_auth" },
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});
console.log(JSON.stringify(await naUsers.from("users").select("id, email, name"), null, 2));

console.log("\n— public.oauth_tokens —");
console.log(JSON.stringify(
  await supabase.from("oauth_tokens").select("user_id, provider, access_token_secret_id, refresh_token_secret_id, expires_at, scopes"),
  null, 2,
));

console.log("\n— vault.decrypted_secrets (first row only) —");
const vault = createClient(url, key, {
  db: { schema: "vault" },
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});
const dec = await vault.from("decrypted_secrets").select("id, name, decrypted_secret").limit(1);
if (dec.data?.[0]) {
  const r = dec.data[0];
  console.log(JSON.stringify({ id: r.id, name: r.name, decrypted_secret_len: r.decrypted_secret?.length }, null, 2));
} else {
  console.log(JSON.stringify(dec, null, 2));
}
