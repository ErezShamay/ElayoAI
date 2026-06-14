import type {
  ResidentPortalGanttMilestone,
  ResidentPortalGanttRow,
} from "@/lib/apartments/types";

const DAY_MS = 24 * 60 * 60 * 1000;

function parseDate(value: string | null | undefined): Date | null {
  if (!value?.trim()) return null;
  const raw = value.trim();
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) return parsed;

  const isoDate = raw.slice(0, 10);
  const fallback = new Date(isoDate);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

function statusColor(status: string): string {
  const normalized = status.trim();
  if (["בוצע", "סיום ביצוע"].includes(normalized)) {
    return "bg-emerald-500";
  }
  if (["בתהליך", "חלקית"].includes(normalized)) {
    return "bg-amber-400";
  }
  if (["לא בוצע"].includes(normalized)) {
    return "bg-zinc-300 dark:bg-zinc-600";
  }
  return "bg-brand";
}

function milestoneColor(kind: ResidentPortalGanttMilestone["kind"]): string {
  if (kind === "inspection") return "bg-sky-500";
  if (kind === "completion") return "bg-emerald-600";
  return "bg-brand";
}

export type GanttRenderModel = {
  rangeStart: Date;
  rangeEnd: Date;
  totalDays: number;
  monthMarkers: { label: string; leftPercent: number }[];
  rows: Array<
    Omit<ResidentPortalGanttRow, "milestones"> & {
      barLeftPercent: number;
      barWidthPercent: number;
      milestones: Array<
        ResidentPortalGanttMilestone & {
          leftPercent: number;
          colorClass: string;
        }
      >;
      statusColorClass: string;
    }
  >;
};

export function buildGanttRenderModel(
  rows: ResidentPortalGanttRow[]
): GanttRenderModel | null {
  if (rows.length === 0) return null;

  const dates: Date[] = [];
  for (const row of rows) {
    for (const milestone of row.milestones) {
      const parsed = parseDate(milestone.date);
      if (parsed) dates.push(parsed);
    }
  }

  if (dates.length === 0) return null;

  const rangeStart = new Date(Math.min(...dates.map((d) => d.getTime())));
  const rangeEnd = new Date(Math.max(...dates.map((d) => d.getTime())));
  rangeStart.setDate(1);
  const endMonth = new Date(rangeEnd);
  endMonth.setMonth(endMonth.getMonth() + 1, 0);
  const normalizedEnd = endMonth;

  const totalDays = Math.max(
    1,
    Math.ceil((normalizedEnd.getTime() - rangeStart.getTime()) / DAY_MS) + 1
  );

  const toPercent = (date: Date) => {
    const offset = (date.getTime() - rangeStart.getTime()) / DAY_MS;
    return Math.min(100, Math.max(0, (offset / totalDays) * 100));
  };

  const monthMarkers: GanttRenderModel["monthMarkers"] = [];
  const cursor = new Date(rangeStart);
  while (cursor <= normalizedEnd) {
    monthMarkers.push({
      label: cursor.toLocaleDateString("he-IL", {
        month: "short",
        year: "2-digit",
      }),
      leftPercent: toPercent(new Date(cursor)),
    });
    cursor.setMonth(cursor.getMonth() + 1, 1);
  }

  const renderedRows = rows.map((row) => {
    const start = parseDate(row.start_date);
    const end = parseDate(row.end_date) ?? start;
    const barLeftPercent = start ? toPercent(start) : 0;
    const barWidthPercent =
      start && end
        ? Math.max(2, toPercent(end) - barLeftPercent)
        : 2;

    return {
      ...row,
      barLeftPercent,
      barWidthPercent,
      statusColorClass: statusColor(row.status ?? ""),
      milestones: row.milestones.map((milestone) => ({
        ...milestone,
        leftPercent: toPercent(parseDate(milestone.date) ?? rangeStart),
        colorClass: milestoneColor(milestone.kind),
      })),
    };
  });

  return {
    rangeStart,
    rangeEnd: normalizedEnd,
    totalDays,
    monthMarkers,
    rows: renderedRows,
  };
}
