import {
  normalizeRole,
} from "@/lib/auth/role";

export const PLATFORM_ADMIN_ROLE = "PLATFORM_ADMIN";
export const ORG_ADMIN_ROLE = "ADMIN";

export function isPlatformAdmin(
  role?: string | null
) {
  return normalizeRole(role) === PLATFORM_ADMIN_ROLE;
}

export function isOrgAdmin(
  role?: string | null
) {
  return normalizeRole(role) === ORG_ADMIN_ROLE;
}

export function isAdmin(
  role?: string | null
) {
  return isPlatformAdmin(role) || isOrgAdmin(role);
}

export function canManageUsers(
  role?: string | null
) {
  return isAdmin(role);
}

export function canManageOrganizations(
  role?: string | null
) {
  return isPlatformAdmin(role);
}

export function inviteableRoles(
  role?: string | null
) {
  if (isPlatformAdmin(role)) {
    return [
      ORG_ADMIN_ROLE,
      "MANAGER",
      "ANALYST",
      "VIEWER",
    ] as const;
  }

  if (isOrgAdmin(role)) {
    return [
      ORG_ADMIN_ROLE,
      "MANAGER",
      "ANALYST",
      "VIEWER",
    ] as const;
  }

  return [] as const;
}

export function isManager(
  role?: string | null
) {

  return [
    PLATFORM_ADMIN_ROLE,
    ORG_ADMIN_ROLE,
    "MANAGER",
  ].includes(
    normalizeRole(role)
  );
}

export function canManageActions(
  role?: string | null
) {

  return [
    PLATFORM_ADMIN_ROLE,
    ORG_ADMIN_ROLE,
    "MANAGER",
  ].includes(
    normalizeRole(role)
  );
}

export function canEscalateActions(
  role?: string | null
) {

  return [
    PLATFORM_ADMIN_ROLE,
    ORG_ADMIN_ROLE,
    "MANAGER",
  ].includes(
    normalizeRole(role)
  );
}

export function canReviewAI(
  role?: string | null
) {

  return [
    PLATFORM_ADMIN_ROLE,
    ORG_ADMIN_ROLE,
    "MANAGER",
  ].includes(
    normalizeRole(role)
  );
}
