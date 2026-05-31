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

type Project = {
  id: string;
  project_name: string;
  status: string;
};

type Organization = {
  id: string;
  organization_name?: string;
  name?: string;
  contact_email?: string;
  projects?: Project[];
};

type AuthContextType = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  sessionRole: string | null;
  organizations: Organization[];
  currentOrgId: string | null;
  loading: boolean;
  switchOrganization: (organizationId: string) => Promise<void>;
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
  const [sessionRole, setSessionRole] = useState<string | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(null);
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

  const loadOrganizations = useCallback(async () => {
    const response = await apiFetch("/auth/organizations");

    if (!response.ok) {
      setOrganizations([]);
      return;
    }

    const data = await response.json();
    const organizations = Array.isArray(data?.organizations)
      ? data.organizations
      : [];

    setOrganizations(
      organizations.map((organization: Organization) => ({
        ...organization,
        projects: organization.projects ?? [],
      }))
    );
  }, []);

  const establishBackendSession = useCallback(
    async (
      nextSession: Session,
      organizationId?: string | null,
    ) => {
      if (!nextSession.user) {
        return false;
      }

      const exchangeData = await exchangeBackendToken(
        nextSession.user.id,
        organizationId,
      );
      setSessionRole(exchangeData.role || null);
      setCurrentOrgId(exchangeData.org_id || null);
      await loadProfile(nextSession.user.id);

      try {
        await loadOrganizations();
      } catch (error) {
        console.warn("Failed loading organizations:", error);
        setOrganizations([]);
      }

      setSession(nextSession);
      setUser(nextSession.user);
      return true;
    },
    [loadOrganizations, loadProfile]
  );

  const handleSession = useCallback(
    async (nextSession: Session | null) => {
      if (FORCE_LOGIN && nextSession?.user) {
        await clearSupabaseSession();
        setSession(null);
        setUser(null);
        setProfile(null);
        setSessionRole(null);
        setOrganizations([]);
        setCurrentOrgId(null);
        return;
      }

      if (!nextSession?.user) {
        clearApiSession();
        setSession(null);
        setUser(null);
        setProfile(null);
        setSessionRole(null);
        setOrganizations([]);
        setCurrentOrgId(null);
        return;
      }

      try {
        await establishBackendSession(nextSession);
      } catch (error) {
        clearApiSession();
        setSession(null);
        setUser(null);
        setProfile(null);
        setSessionRole(null);
        setOrganizations([]);
        setCurrentOrgId(null);

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

  async function switchOrganization(organizationId: string) {
    if (!session?.user) {
      return;
    }

    await establishBackendSession(session, organizationId);
  }

  async function signOut() {
    await clearSupabaseSession();
    setSession(null);
    setUser(null);
    setProfile(null);
    setSessionRole(null);
    setOrganizations([]);
    setCurrentOrgId(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        sessionRole,
        organizations,
        currentOrgId,
        loading,
        switchOrganization,
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
