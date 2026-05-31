export function normalizeRole(
  role?: string | null
): string {
  return (role || "").trim().toUpperCase();
}

export function resolveEffectiveRole(
  profileRole?: string | null,
  sessionRole?: string | null,
): string | null {
  const normalized = normalizeRole(
    profileRole || sessionRole
  );

  return normalized || null;
}
