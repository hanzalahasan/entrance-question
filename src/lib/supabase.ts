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

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url as string, anonKey as string)
  : null;
