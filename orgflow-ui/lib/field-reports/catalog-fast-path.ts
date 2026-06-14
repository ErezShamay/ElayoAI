/** Supervision pivot stage D — Fast-Path catalog (≤3 taps). */

export const SUPERVISION_CATEGORY_LABELS_HE: Record<string, string> = {
  STRUCTURAL_WORKS: "שלד",
  FINISHING_WORKS: "גמר",
  MECHANICAL_ELECTRICAL_SYSTEMS: "מערכות",
  SYSTEM_WATERPROOFING_AND_INSULATION: "איטום",
};

/** Gate C→D bar (§13.1): taps from picker open to report line. */
export const CATALOG_FAST_PATH_MAX_TAPS = 3;

/** Issue tap adds the line immediately (no separate confirm tap). */
export const CATALOG_FAST_PATH_AUTO_CONFIRM = true;

export type FastPathCatalogFamily = {
  top_family: string;
  label_he?: string;
  issue_count?: number;
};

export type FastPathCatalogIssue = {
  issue_id: string;
  top_family: string;
  category_id: string;
  category_name_he: string;
};

export function supervisionCategoryLabelHe(topFamily: string): string {
  return SUPERVISION_CATEGORY_LABELS_HE[topFamily] || topFamily;
}

export function listSupervisionCategories(
  families: FastPathCatalogFamily[]
): Array<{
  top_family: string;
  label_he: string;
  issue_count: number;
}> {
  return families
    .map((family) => ({
      top_family: family.top_family,
      label_he: supervisionCategoryLabelHe(family.top_family),
      issue_count: family.issue_count ?? 0,
    }))
    .filter((entry) => entry.issue_count > 0)
    .sort((left, right) =>
      left.label_he.localeCompare(right.label_he, "he")
    );
}

export function filterIssuesForSupervisionCategory<
  T extends FastPathCatalogIssue,
>(issues: T[], topFamily: string): T[] {
  return issues.filter((issue) => issue.top_family === topFamily);
}

export function computeCatalogPickerTapCount(options?: {
  autoConfirmOnIssueSelect?: boolean;
}): number {
  const autoConfirm =
    options?.autoConfirmOnIssueSelect ?? CATALOG_FAST_PATH_AUTO_CONFIRM;
  // 1 = supervision category, 2 = issue (+ auto-add when enabled)
  return autoConfirm ? 2 : 3;
}

export function countFastPathTapsToLine(steps: {
  categorySelected: boolean;
  issueSelected: boolean;
  confirmSelected: boolean;
}): number {
  let taps = 0;
  if (steps.categorySelected) {
    taps += 1;
  }
  if (steps.issueSelected) {
    taps += 1;
  }
  if (steps.confirmSelected) {
    taps += 1;
  }
  return taps;
}

export function fastPathMeetsGate(tapCount: number): boolean {
  return tapCount > 0 && tapCount <= CATALOG_FAST_PATH_MAX_TAPS;
}
