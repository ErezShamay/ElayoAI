import { normalizeRole } from "@/lib/auth/role";

/** Mirrors backend `field_reports:finalize` — SUPERVISOR only. */
export function canFinalizeFieldReports(role?: string | null): boolean {
  return normalizeRole(role) === "SUPERVISOR";
}

/** @deprecated Use canFinalizeFieldReports — manager publish flow removed in F6. */
export function canPublishFieldReports(_role?: string | null): boolean {
  return false;
}

/** @deprecated Publish CTA removed in F6 finalize pipeline. */
export const PUBLISH_REPORT_CTA_LABEL = "אשר ופרסם לפורטל" as const;
