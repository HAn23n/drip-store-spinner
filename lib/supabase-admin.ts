import "server-only";
import { createClient } from "@supabase/supabase-js";

const TABLE = "wheel_prizes";
const SPIN_HISTORY = "spin_history";

function envOrThrow(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var ${name}`);
  return v;
}

export function hasSupabaseConfig(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY);
}

// Read-only client, anon key — matches the "public read" RLS policy.
export function supabaseReadClient() {
  return createClient(envOrThrow("SUPABASE_URL"), envOrThrow("SUPABASE_ANON_KEY"), {
    auth: { persistSession: false },
  });
}

// service_role client — bypasses RLS. Only ever used inside API routes,
// never sent to the browser.
export function supabaseWriteClient() {
  return createClient(envOrThrow("SUPABASE_URL"), envOrThrow("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false },
  });
}

export const WHEEL_TABLE = TABLE;
export const SPIN_HISTORY_TABLE = SPIN_HISTORY;
