import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { GLOBAL_NAV_LINKS } from "@/lib/navigation";
import { getSupervisionPrimaryNavLinks } from "@/lib/qc-navigation";

const UI_ROOT = path.resolve(__dirname, "../..");

const HOME_PAGE_SOURCE_FILES = [
  "app/page.tsx",
  "components/landing/PublicHomePage.tsx",
  "components/landing/PublicNavBar.tsx",
  "components/landing/HeroDashboardPreview.tsx",
  "components/landing/LandingSystemCtaLink.tsx",
  "components/landing/HomeScrollManager.tsx",
] as const;

const FORBIDDEN_HOME_VALUE_TERMS = [
  "ניהול פרויקטים",
  "אוטומציה",
  "פעולות תפעוליות",
  "בקרת איכות",
  "Quality Control",
] as const;

const SUPERVISION_WORKFLOW_STEP_TITLES = [
  "מפקח יוצר דוח ביקור בשטח",
  "סגירת דוח — טיוטה פנימית",
  "אשר ופרסם — רישום ליקויים + PDF",
  "תיק פיקוח — תמונת מצב",
] as const;

const SUPERVISION_WORKFLOW_PILLAR_VALUES = [
  "דוחות שטח",
  "ליקויים",
  "אישור ופרסום",
  "תיק פיקוח",
] as const;

function readSource(relativePath: string): string {
  return readFileSync(path.join(UI_ROOT, relativePath), "utf8");
}

function readHomePageSources(): string {
  return HOME_PAGE_SOURCE_FILES.map((relativePath) => readSource(relativePath)).join(
    "\n"
  );
}

describe("stage 5 gate (supervision pivot — stage A)", () => {
  it("home page leads with supervision messaging, not project management", () => {
    const homePage = readSource("components/landing/PublicHomePage.tsx");
    const cta = readSource("components/landing/LandingSystemCtaLink.tsx");

    expect(homePage).toContain("דוחות ביקור בשטח");
    expect(homePage).toContain("שטח מסודר");
    expect(homePage).toContain("ניהול שקט");
    expect(homePage).toContain("אישור ופרסום");
    expect(cta).toContain("התחל דוח שטח");
    expect(homePage).not.toContain("שלוט בפרויקט");
    expect(cta).not.toContain("שלוט בפרויקט");
  });

  it("primary navigation excludes operational review and uses supervision order", () => {
    expect(GLOBAL_NAV_LINKS).toHaveLength(4);
    expect(GLOBAL_NAV_LINKS.map((link) => link.href)).not.toContain(
      "/operational-review"
    );

    const supervisorLinks = getSupervisionPrimaryNavLinks({ role: "SUPERVISOR" });
    expect(supervisorLinks).toHaveLength(4);
    expect(supervisorLinks.map((link) => link.href)).toEqual(
      GLOBAL_NAV_LINKS.map((link) => link.href)
    );

    expect(getSupervisionPrimaryNavLinks({ role: "CONTRACTOR" })).toEqual([]);
    expect(getSupervisionPrimaryNavLinks({ role: "DEVELOPER" })).toEqual([]);
  });

  it("home page omits PM and automation value propositions", () => {
    const source = readHomePageSources();

    for (const term of FORBIDDEN_HOME_VALUE_TERMS) {
      expect(source).not.toContain(term);
    }
  });

  it("home page workflow mirrors supervision path", () => {
    const homePage = readSource("components/landing/PublicHomePage.tsx");

    expect(homePage).toContain("const WORKFLOW_STEPS = [");
    expect(homePage).toContain("const WORKFLOW_PILLARS = [");
    expect(homePage).toMatch(/WORKFLOW_STEPS[\s\S]*?step: "04"/);

    for (const title of SUPERVISION_WORKFLOW_STEP_TITLES) {
      expect(homePage).toContain(title);
    }

    for (const value of SUPERVISION_WORKFLOW_PILLAR_VALUES) {
      expect(homePage).toContain(`value: "${value}"`);
    }
  });
});
