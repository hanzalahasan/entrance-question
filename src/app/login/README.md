# `/login` — sign in / sign up

One screen for both: toggle between **Sign in** and **Create account**, plus
**Continue with Google**. Email/password uses `supabase.auth.signInWithPassword`
/ `signUp` (the name is stored in user metadata → copied to `profiles` by the DB
trigger). Google uses `signInWithOAuth`.

- `?next=/path` controls where to land after auth (e.g. `/login?next=/mock`);
  defaults to `/dashboard`. Already-signed-in users are bounced straight there.
- If email confirmation is on in Supabase, signup shows a "check your email"
  message instead of an immediate session.
- Shows a setup notice if Supabase isn't configured.

Requires `supabase/auth-setup.sql` + Email/Google providers enabled in the
Supabase dashboard (Google also needs OAuth credentials from Google Cloud).
