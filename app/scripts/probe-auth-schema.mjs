import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
console.log("URL:", url);

const supabase = createClient(url, key, {
  db: { schema: "next_auth" },
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

console.log("\n— SELECT next_auth.users (limit 1) —");
const sel = await supabase.from("users").select("id, email").limit(1);
console.log(JSON.stringify(sel, null, 2));

console.log("\n— INSERT next_auth.users —");
const ins = await supabase
  .from("users")
  .insert({ email: `probe+${Date.now()}@lens.test`, name: "Probe" })
  .select()
  .single();
console.log(JSON.stringify(ins, null, 2));

if (ins.data?.id) {
  console.log("\n— DELETE probe row —");
  const del = await supabase.from("users").delete().eq("id", ins.data.id);
  console.log(JSON.stringify(del, null, 2));
}
