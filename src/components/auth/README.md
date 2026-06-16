# `components/auth/` — auth UI

| Component | Purpose |
|---|---|
| `auth-status.tsx` | Header widget: a **Log in** link for guests, or the user's avatar + a menu (Dashboard, Sign out) when signed in. Renders nothing if Supabase auth isn't configured. Used on the home, mock, and dashboard headers. |

The login/signup screen itself is the route `app/login/page.tsx`. State comes from
`context/auth-context` (`useAuth`).
