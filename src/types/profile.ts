// A user's profile (one row per Supabase Auth user). Mirrors the `profiles`
// table in supabase/auth-setup.sql.
export type Profile = {
  id: string;
  fullName: string | null;
  avatarUrl: string | null;
  email: string | null;
  phone: string | null;
  createdAt: string;
};
