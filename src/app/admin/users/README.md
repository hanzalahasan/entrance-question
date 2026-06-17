# `/admin/users` — super-admin user list

Lists everyone who signed up: **name, email, phone, joined, last login**, and
their activity (**mocks taken + avg %, practice questions + accuracy**). Sorted by
most recent sign-in, with totals (all users / ever-signed-in).

Data comes from `GET /api/admin/users` (service-role, RLS-bypassing — protected
by the admin cookie). Requires **`SUPABASE_SERVICE_ROLE_KEY`** in env; shows a
notice until it's set. Set **`ADMIN_PASSWORD`** too so the admin area (and this
PII) is actually protected.
