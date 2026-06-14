import { isResidentRole } from "@/lib/auth/resident-access";

export const RESIDENT_ALLOWED_ROUTE_PREFIXES = [
  "/my-apartment",
  "/auth",
] as const;

export const RESIDENT_POST_LOGIN_ROUTE = "/my-apartment";

export function isResidentAllowedRoute(pathname: string): boolean {
  const normalized = pathname.trim() || "/";

  return RESIDENT_ALLOWED_ROUTE_PREFIXES.some(
    (prefix) =>
      normalized === prefix || normalized.startsWith(`${prefix}/`)
  );
}

export function canResidentAccessRoute(
  role: string | null | undefined,
  pathname: string
): boolean {
  if (!isResidentRole(role)) {
    return true;
  }

  return isResidentAllowedRoute(pathname);
}

export function residentDeniedRouteRedirect(): string {
  return RESIDENT_POST_LOGIN_ROUTE;
}
