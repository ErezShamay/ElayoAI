"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import {
  User,
  Session,
} from "@supabase/supabase-js";

import {
  apiFetch,
  clearApiSession,
  exchangeBackendToken,
  TokenExchangeError,
} from "@/lib/api/client";
import { supabase } from "@/lib/supabase";

type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  organization_id?: string | null;
};

type AuthContextType = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext =
  createContext<
    AuthContextType | undefined
  >(undefined);

async function clearSupabaseSession() {
  clearApiSession();
  await supabase.auth.signOut();
}

export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const FORCE_LOGIN =
    process.env.NEXT_PUBLIC_FORCE_LOGIN === "true";

  const loadProfile = useCallback(async (userId: string) => {
    const response = await apiFetch(`/profiles/${userId}`);

    if (!response.ok) {
      throw new Error("Failed loading profile");
    }

    const data = await response.json();
    setProfile(data);
  }, []);

  const establishBackendSession = useCallback(
    async (nextSession: Session) => {
      if (!nextSession.user) {
        return false;
      }

      await exchangeBackendToken(nextSession.user.id);
      await loadProfile(nextSession.user.id);
      setSession(nextSession);
      setUser(nextSession.user);
      return true;
    },
    [loadProfile]
  );

  const handleSession = useCallback(
    async (nextSession: Session | null) => {
      if (FORCE_LOGIN && nextSession?.user) {
        await clearSupabaseSession();
        setSession(null);
        setUser(null);
        setProfile(null);
        return;
      }

      if (!nextSession?.user) {
        clearApiSession();
        setSession(null);
        setUser(null);
        setProfile(null);
        return;
      }

      try {
        await establishBackendSession(nextSession);
      } catch (error) {
        clearApiSession();
        setSession(null);
        setUser(null);
        setProfile(null);

        const shouldSignOut =
          error instanceof TokenExchangeError
          && [404, 422].includes(error.status);

        if (shouldSignOut) {
          await supabase.auth.signOut();
        } else {
          console.warn(
            "Failed bootstrapping backend session:",
            error
          );
        }
      }
    },
    [FORCE_LOGIN, establishBackendSession]
  );

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        void handleSession(nextSession).finally(() => {
          setLoading(false);
        });
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [handleSession]);

  async function signOut() {
    await clearSupabaseSession();
    setSession(null);
    setUser(null);
    setProfile(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider"
    );
  }

  return context;
}
