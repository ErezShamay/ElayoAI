export const PROJECT_START_AFTER_END_MESSAGE =
  "תאריך ההתחלה חייב להיות לפני תאריך הסיום";

export const PROJECT_GRACE_BEFORE_END_MESSAGE =
  "תאריך הגרייס חייב להיות אחרי תאריך הסיום";

export const DATE_RANGE_START_AFTER_END_MESSAGE =
  "תאריך ההתחלה חייב להיות לפני תאריך הסיום";

export type ProjectDateFields = {
  project_start_date?: string | null;
  project_end_date?: string | null;
  project_grace_end_date?: string | null;
};

function parseOptionalIsoDate(value?: string | null): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const candidate = trimmed.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(candidate) ? candidate : null;
}

export function validateProjectDates(
  dates: ProjectDateFields
): string | null {
  const start = parseOptionalIsoDate(dates.project_start_date);
  const end = parseOptionalIsoDate(dates.project_end_date);
  const grace = parseOptionalIsoDate(dates.project_grace_end_date);

  if (start && end && start >= end) {
    return PROJECT_START_AFTER_END_MESSAGE;
  }

  if (end && grace && grace <= end) {
    return PROJECT_GRACE_BEFORE_END_MESSAGE;
  }

  return null;
}

export function validateDateRange(
  startDate?: string | null,
  endDate?: string | null
): string | null {
  const start = parseOptionalIsoDate(startDate);
  const end = parseOptionalIsoDate(endDate);

  if (start && end && start >= end) {
    return DATE_RANGE_START_AFTER_END_MESSAGE;
  }

  return null;
}

export function extractProjectDatesFromHeaderFields(
  headerFields: Record<string, unknown> | null | undefined
): ProjectDateFields {
  if (!headerFields) {
    return {};
  }

  const metadata =
    headerFields.project_metadata &&
    typeof headerFields.project_metadata === "object"
      ? (headerFields.project_metadata as Record<string, unknown>)
      : {};

  function pick(key: keyof ProjectDateFields): string | null {
    for (const source of [headerFields, metadata]) {
      const value = source[key];
      if (typeof value === "string" && value.trim()) {
        return value.trim();
      }
    }
    return null;
  }

  return {
    project_start_date: pick("project_start_date"),
    project_end_date: pick("project_end_date"),
    project_grace_end_date: pick("project_grace_end_date"),
  };
}
