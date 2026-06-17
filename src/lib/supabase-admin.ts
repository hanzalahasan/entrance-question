// SERVER-ONLY service-role Supabase client. Bypasses RLS, so it can read every
// user's data — used ONLY by protected admin API routes (e.g. /api/admin/users).
// NEVER import this from client code: it reads SUPABASE_SERVICE_ROLE_KEY, a
// secret (not NEXT_PUBLIC), which must never reach the browser.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabaseAdmin: SupabaseClient | null =
  url && serviceKey
    ? createClient(url, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;
