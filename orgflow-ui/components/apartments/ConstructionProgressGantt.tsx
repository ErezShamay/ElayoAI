"use client";

import { buildGanttRenderModel } from "@/lib/apartments/gantt";
import type { ResidentPortalGanttRow } from "@/lib/apartments/types";

type ConstructionProgressGanttProps = {
  rows: ResidentPortalGanttRow[];
};

const KIND_LABELS: Record<string, string> = {
  progress: "התקדמות",
  inspection: "בדיקה",
  completion: "סיום",
};

export default function ConstructionProgressGantt({
  rows,
}: ConstructionProgressGanttProps) {
  const model = buildGanttRenderModel(rows);

  if (!model) {
    return (
      <p className="text-sm text-zinc-500">
        אין מספיק תאריכים להצגת לוח גנט. הנתונים יופיעו כשיתווספו דוחות עם תאריכים.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 text-xs text-zinc-500">
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-brand" /> התקדמות
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-sky-500" /> בדיקת מפקח
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-emerald-600" /> סיום
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-200/80 dark:border-zinc-700/80">
        <div className="min-w-[720px] p-4">
          <div className="relative mb-3 h-6 border-b border-zinc-200/80 dark:border-zinc-700/80">
            {model.monthMarkers.map((marker) => (
              <span
                key={`${marker.label}-${marker.leftPercent}`}
                className="absolute top-0 -translate-x-1/2 text-[10px] text-zinc-500"
                style={{ left: `${marker.leftPercent}%` }}
              >
                {marker.label}
              </span>
            ))}
          </div>

          <div className="space-y-4">
            {model.rows.map((row) => (
              <div key={row.task_key} className="grid grid-cols-[160px_1fr] gap-3">
                <div className="text-sm">
                  <p className="font-medium leading-snug">{row.label}</p>
                  {row.status ? (
                    <p className="mt-1 text-xs text-zinc-500">{row.status}</p>
                  ) : null}
                </div>

                <div className="relative h-10 rounded-lg bg-zinc-100/80 dark:bg-zinc-800/50">
                  <div
                    className={`absolute top-1/2 h-3 -translate-y-1/2 rounded-full opacity-80 ${row.statusColorClass}`}
                    style={{
                      left: `${row.barLeftPercent}%`,
                      width: `${row.barWidthPercent}%`,
                    }}
                  />

                  {row.milestones.map((milestone, index) => (
                    <div
                      key={`${milestone.date}-${milestone.label}-${index}`}
                      className="group absolute top-1/2 z-10 -translate-x-1/2 -translate-y-1/2"
                      style={{ left: `${milestone.leftPercent}%` }}
                    >
                      <span
                        className={`block h-3.5 w-3.5 rotate-45 rounded-sm ${milestone.colorClass}`}
                      />
                      <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden w-44 -translate-x-1/2 rounded-lg bg-zinc-900 px-2 py-1.5 text-[10px] text-white shadow-lg group-hover:block">
                        <p className="font-medium">{milestone.label}</p>
                        <p className="opacity-80">
                          {KIND_LABELS[milestone.kind] || milestone.kind} ·{" "}
                          {milestone.date}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
