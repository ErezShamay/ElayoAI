import { normalizeRole } from "@/lib/auth/role";

/** Mirrors backend `field_reports:publish` (ADMIN, MANAGER, PLATFORM_ADMIN). */
export function canPublishFieldReports(role?: string | null): boolean {
  const normalized = normalizeRole(role);
  return (
    normalized === "ADMIN"
    || normalized === "MANAGER"
    || normalized === "PLATFORM_ADMIN"
  );
}

export const PUBLISH_REPORT_CTA_LABEL = "אשר ופרסם לפורטל" as const;
