"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase";
import type { Profile } from "@/types/profile";

type AuthState = {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  authReady: boolean; // Supabase configured?
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState>({
  user: null,
  profile: null,
  loading: true,
  authReady: false,
  refreshProfile: async () => {},
  signOut: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

type ProfileRow = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
  phone: string | null;
  created_at: string;
};

function mapProfile(r: ProfileRow): Profile {
  return {
    id: r.id,
    fullName: r.full_name,
    avatarUrl: r.avatar_url,
    email: r.email,
    phone: r.phone,
    createdAt: r.created_at,
  };
}

async function loadProfile(userId: string): Promise<Profile | null> {
  if (!supabase) return null;
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  return data ? mapProfile(data as ProfileRow) : null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  // If Supabase isn't configured, auth is off and we're done loading immediately.
  const [loading, setLoading] = useState(Boolean(supabase));

  async function refreshProfile() {
    if (user) setProfile(await loadProfile(user.id));
  }

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(async ({ data }) => {
      const u = data.session?.user ?? null;
      setUser(u);
      if (u) setProfile(await loadProfile(u.id));
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const u = session?.user ?? null;
        setUser(u);
        setProfile(u ? await loadProfile(u.id) : null);
      }
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  async function signOut() {
    await supabase?.auth.signOut();
    setUser(null);
    setProfile(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        authReady: Boolean(supabase),
        refreshProfile,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
