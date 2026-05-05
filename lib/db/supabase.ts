/**
 * Supabase admin client, pinned to the greenscape schema.
 *
 * Used by every backend code path that touches the DB. Service-role key
 * bypasses RLS — never import this from a client component.
 *
 * The greenscape-pinned client doesn't match Supabase's default `<"public">`
 * generic so the type is widened. API code accesses tables by string anyway.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

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
