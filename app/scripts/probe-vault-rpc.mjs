import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

const { data: rows } = await supabase.from("oauth_tokens").select("access_token_secret_id").limit(1);
const id = rows?.[0]?.access_token_secret_id;
console.log("secret_id:", id);

const out = await supabase.rpc("vault_read_secret", { secret_id: id });
console.log(JSON.stringify(out, null, 2));
