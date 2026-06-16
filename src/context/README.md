# `context/` — React context providers

| File | Purpose |
|---|---|
| `auth-context.tsx` | `AuthProvider` + `useAuth()` — the signed-in Supabase user + their `profiles` row, loaded via `supabase.auth` (client-side, session persisted in localStorage). Wraps the app in `app/layout.tsx`. Exposes `{ user, profile, loading, authReady, refreshProfile, signOut }`. |

Auth uses the shared anon client in `lib/supabase.ts`; once signed in, its JWT is
attached automatically so RLS (`auth.uid()`) works. Requires
`supabase/auth-setup.sql` (profiles table + trigger) and Email/Google providers
enabled in the Supabase dashboard.
