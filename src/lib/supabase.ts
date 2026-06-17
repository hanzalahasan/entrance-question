import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * True only when real Supabase credentials are present. When false, the app
 * falls back to localStorage (see repository.ts) so it still runs with no setup.
 */
export const isSupabaseConfigured =
  !!url &&
  !!anonKey &&
  !url.includes("your-project") &&
  !anonKey.includes("your-anon");

// The default client: persists the auth session, so once a user logs in its
// requests carry their JWT (the `authenticated` role). Use this for auth and
// user-owned data (profiles, mock_results).
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url as string, anonKey as string)
  : null;

/**
 * A SECOND client that never carries a login session — it always uses the anon
 * key. Use this for the PUBLIC, shared data (the question bank, subjects/topics,
 * published mock sets). Without it, once a student signs in, supabase-js would
 * send their `authenticated` JWT for these reads; if those (admin-owned) tables
 * only grant the `anon` role, the read fails and the page breaks. Reading public
 * data as anon avoids depending on per-role grants/policies entirely.
 */
export const supabasePublic: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url as string, anonKey as string, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        storageKey: "eq-public-noauth",
      },
    })
  : null;
