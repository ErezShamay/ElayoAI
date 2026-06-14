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

describe("stage 5.8.5.3 gate (workflow step 03 - publish)", () => {
  it("describes manager publish to registry, PDF and portal", () => {
    const source = readPublicHomePage();

    expect(source).toContain('title: "אשר ופרסם — רישום ליקויים + PDF"');
    expect(source).toContain("עדכון רישום הליקויים");
    expect(source).toContain("פורטל הרוכש");
    expect(source).not.toContain('title: "אישור ויצירת פעולות"');
    expect(source).not.toContain("מנהל מאשר או דוחה את הביקורת");
  });
});
