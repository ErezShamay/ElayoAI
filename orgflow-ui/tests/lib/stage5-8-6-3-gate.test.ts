import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const UI_ROOT = path.resolve(__dirname, "../..");
const PUBLIC_HOME_PAGE = path.join(
  UI_ROOT,
  "components/landing/PublicHomePage.tsx"
);

function readPublicHomePage(): string {
  return readFileSync(PUBLIC_HOME_PAGE, "utf8");
}

describe("stage 5.8.6.3 gate (platform bullets - supervision)", () => {
  it("lists supervision capabilities instead of PM dashboards and automation", () => {
    const source = readPublicHomePage();

    expect(source).toContain("const PLATFORM_BULLETS = [");
    expect(source).toContain("ליקויים שפורסמו לפי חומרה");
    expect(source).toContain("PDF לוועד בלי Word");
    expect(source).toContain("פורטל שקיפות לרוכש");
    expect(source).toContain("עבודה offline בשטח");
    expect(source).toContain("PLATFORM_BULLETS.map");
    expect(source).not.toContain("דשבורד KPI לכל פרויקט");
    expect(source).not.toContain("מעקב חריגות ואסקלציות");
    expect(source).not.toContain("התראות ועדכונים בזמן אמת");
    expect(source).not.toContain("אוטומציה ותורים חכמים");
  });
});
