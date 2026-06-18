import type { ProjectScheme } from "./schema/types";

/** אפשרויות סוג פרויקט ל-dropdown ב-UI (FR-1.2). */
export const PROJECT_SCHEME_OPTIONS: ReadonlyArray<{
  value: ProjectScheme;
  label: string;
}> = [
  { value: "TAMA38_STRENGTHENING", label: "חיזוק" },
  { value: "TAMA38_DEMOLITION_REBUILD", label: "הריסה ובניה" },
  { value: "TAMA38_RELOCATED_BUILD", label: "פינוי בינוי" },
  { value: "NEW_CONSTRUCTION", label: "בנייה חדשה" },
] as const;

/** תווית עברית מלאה לשורת סוג פרויקט ב-PDF. */
export function projectSchemeLabelHe(scheme: ProjectScheme): string {
  if (scheme === "NEW_CONSTRUCTION") {
    return "בנייה חדשה";
  }
  const short =
    PROJECT_SCHEME_OPTIONS.find((option) => option.value === scheme)?.label ??
    "";
  return `התחדשות עירונית - פרויקט ${short} תמ"א`;
}
