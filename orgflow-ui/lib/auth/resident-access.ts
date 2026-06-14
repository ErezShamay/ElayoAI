import { normalizeRole } from "@/lib/auth/role";

export const RESIDENT_ROLE = "RESIDENT";

export function isResidentRole(role?: string | null): boolean {
  return normalizeRole(role) === RESIDENT_ROLE;
}
