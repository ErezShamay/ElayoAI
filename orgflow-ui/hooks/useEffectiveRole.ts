"use client";

import {
  useAuth,
} from "@/contexts/AuthContext";
import {
  canManageOrganizations,
  canManageUsers,
  isPlatformAdmin,
} from "@/lib/auth/permissions";
import {
  resolveEffectiveRole,
} from "@/lib/auth/role";

export function useEffectiveRole() {
  const {
    profile,
    sessionRole,
  } = useAuth();

  return resolveEffectiveRole(
    profile?.role,
    sessionRole
  );
}

export function useCanManageUsers() {
  return canManageUsers(useEffectiveRole());
}

export function useCanManageOrganizations() {
  return canManageOrganizations(useEffectiveRole());
}

export function useIsPlatformAdmin() {
  return isPlatformAdmin(useEffectiveRole());
}

export function useIsAdmin() {
  return useCanManageUsers();
}
