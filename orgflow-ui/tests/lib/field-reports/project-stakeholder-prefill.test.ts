import { describe, expect, it } from "vitest";

import {
  mergeStakeholderPrefill,
  stakeholdersFromProject,
} from "@/lib/field-reports/project-stakeholder-prefill";
import { stakeholderRoleLabelHe } from "@/lib/field-reports/stakeholder-role-labels";

describe("stakeholdersFromProject", () => {
  it("maps project stakeholder fields to roles", () => {
    const list = stakeholdersFromProject({
      developer_name: "יזם א",
      developer_pm_name: "דני",
      contractor_name: "קבלן ב",
      lawyer_name: "עו״ד כהן",
    });

    expect(list).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ role: "developer", name: "יזם א" }),
        expect.objectContaining({ role: "project_manager", name: "דני" }),
        expect.objectContaining({ role: "contractor", name: "קבלן ב" }),
        expect.objectContaining({ role: "lawyer_tenants", name: "עו״ד כהן" }),
      ])
    );
  });

  it("uses contractor as project_manager when pm missing", () => {
    const list = stakeholdersFromProject({
      contractor_name: "קבלן בלבד",
    });

    expect(list).toEqual([
      expect.objectContaining({
        role: "project_manager",
        name: "קבלן בלבד",
      }),
      expect.objectContaining({ role: "contractor", name: "קבלן בלבד" }),
    ]);
  });
});

describe("mergeStakeholderPrefill", () => {
  it("does not overwrite existing names", () => {
    const merged = mergeStakeholderPrefill(
      [
        {
          id: "dev-1",
          role: "developer",
          name: "שם קיים",
          label_he: stakeholderRoleLabelHe("developer"),
        },
      ],
      [
        {
          id: "prefill-developer",
          role: "developer",
          name: "יזם מפרויקט",
          label_he: stakeholderRoleLabelHe("developer"),
        },
      ]
    );

    expect(merged).toEqual([
      expect.objectContaining({ role: "developer", name: "שם קיים" }),
    ]);
  });

  it("fills empty roles from prefill", () => {
    const merged = mergeStakeholderPrefill(
      [],
      stakeholdersFromProject({ lawyer_name: "עו״ד חדש" })
    );

    expect(merged).toEqual([
      expect.objectContaining({ role: "lawyer_tenants", name: "עו״ד חדש" }),
    ]);
  });
});
