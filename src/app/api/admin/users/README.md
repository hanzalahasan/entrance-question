# `users` — super-admin user list

`GET /api/admin/users` — every signed-up user with contact details + activity, for
the admin Users page. Uses the **service-role** Supabase client
(`lib/supabase-admin.ts`) which **bypasses RLS**, so it can read all users.

## Security
- **Protected**: when `ADMIN_PASSWORD` is set, the route requires the `admin_token`
  cookie to match (same token the admin pages use). The `/admin/*` middleware only
  guards pages, so the check is repeated here for the API.
- Returns a `503` until `SUPABASE_SERVICE_ROLE_KEY` is set (Supabase → Settings →
  API → service_role key). This is a **secret** — server-only, never `NEXT_PUBLIC`.

## Response
`{ total, everSignedIn, users: [{ id, name, email, phone, createdAt, lastSignIn,
mocks, avgMockPct, lastMock, practice, practiceAccuracy }] }` — sorted by most
recent sign-in.

Data: `auth.admin.listUsers()` (emails/phones/sign-in) + `profiles` (name) +
`mock_results` + `practice_attempts` tallies. UI: `app/admin/users/page.tsx`.
