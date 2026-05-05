import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// The greenscape-pinned client doesn't fit the default <"public"> generic, so widen
// to a loose alias. API routes only access tables by string anyway.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminClient = SupabaseClient<any, any, any>;

let cached: AdminClient | null = null;

export function getSupabaseAdmin(): AdminClient {
  if (cached) return cached;

  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) throw new Error("SUPABASE_URL is not set");
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");

  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: "greenscape" },
  }) as AdminClient;
  return cached;
}
