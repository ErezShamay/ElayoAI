import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  parseApartmentsExcel,
  parseContactsExcel,
  tryParseExcelToTenants,
} from "@/lib/tenants/parsers";

const fixturesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../public/templates"
);

function csvFile(name: string, content: string) {
  return new File([content], name, { type: "text/csv" });
}

function readTemplate(name: string) {
  return readFileSync(path.join(fixturesDir, name), "utf8");
}

describe("tenant import CSV templates", () => {
  it("parses a filled single-file template", async () => {
    const csv = `${readTemplate("tenants-import-single.csv").trim()}
דוגמה בעלים,101,א,1,0501234567,resident@example.com`;

    const tenants = await tryParseExcelToTenants(
      csvFile("filled-single.csv", csv)
    );

    expect(tenants).toHaveLength(1);
    expect(tenants?.[0]).toMatchObject({
      name: "דוגמה בעלים",
      apartment: "101",
      building: "א",
      entrance: "1",
      phone: "0501234567",
      email: "resident@example.com",
    });
  });

  it("parses a filled apartments template", async () => {
    const csv = `${readTemplate("tenants-import-apartments.csv").trim()}
דוגמה בעלים,202,ב,2`;

    const tenants = await parseApartmentsExcel(
      csvFile("filled-apartments.csv", csv)
    );

    expect(tenants).toHaveLength(1);
    expect(tenants?.[0]).toMatchObject({
      name: "דוגמה בעלים",
      apartment: "202",
      building: "ב",
      entrance: "2",
    });
  });

  it("parses a filled contacts template", async () => {
    const csv = `${readTemplate("tenants-import-contacts.csv").trim()}
דוגמה בעלים,303,0509876543,owner@example.com`;

    const tenants = await parseContactsExcel(
      csvFile("filled-contacts.csv", csv)
    );

    expect(tenants).toHaveLength(1);
    expect(tenants?.[0]).toMatchObject({
      name: "דוגמה בעלים",
      apartment: "303",
      phone: "0509876543",
      email: "owner@example.com",
    });
  });
});
