const DAY_MS = 24 * 60 * 60 * 1000;

export function formatIsoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function defaultDeliverableReportRange(): {
  startDate: string;
  endDate: string;
} {
  const end = new Date();
  const start = new Date(end.getTime() - 89 * DAY_MS);
  return {
    startDate: formatIsoDate(start),
    endDate: formatIsoDate(end),
  };
}

export function buildDeliverableReportsQuery(
  startDate: string,
  endDate: string,
  projectId?: string | null
): string {
  const params = new URLSearchParams({
    start_date: startDate,
    end_date: endDate,
  });

  if (projectId?.trim()) {
    params.set("project_id", projectId.trim());
  }

  return `/portfolio/deliverable-reports?${params.toString()}`;
}
