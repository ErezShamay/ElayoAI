import { describe, expect, it } from "vitest";

import { buildGanttRenderModel } from "@/lib/apartments/gantt";
import type { ResidentPortalGanttRow } from "@/lib/apartments/types";

describe("buildGanttRenderModel", () => {
  it("builds a timeline from gantt rows", () => {
    const rows: ResidentPortalGanttRow[] = [
      {
        task_key: "task-1",
        label: "איטום",
        status: "בתהליך",
        start_date: "2026-03-01",
        end_date: "2026-04-01",
        milestones: [
          {
            date: "2026-03-01",
            label: "התחלה",
            kind: "progress",
          },
          {
            date: "2026-04-01",
            label: "סיום",
            kind: "completion",
          },
        ],
      },
    ];

    const model = buildGanttRenderModel(rows);

    expect(model).not.toBeNull();
    expect(model?.rows).toHaveLength(1);
    expect(model?.rows[0]?.milestones).toHaveLength(2);
    expect(model?.monthMarkers.length).toBeGreaterThan(0);
  });

  it("returns null when there are no dated milestones", () => {
    expect(
      buildGanttRenderModel([
        {
          task_key: "empty",
          label: "ריק",
          milestones: [],
        },
      ])
    ).toBeNull();
  });
});
