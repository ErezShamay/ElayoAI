import type { Tenant } from "./types";

export type { Tenant };

function escapeCsv(value: string): string {
  const v = value ?? "";
  if (/[",\n\r]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

function toCsv(headers: string[], rows: string[][], options: { bom?: boolean } = {}): string {
  const { bom = true } = options;
  const lines = [headers.map(escapeCsv).join(",")];
  for (const row of rows) lines.push(row.map(escapeCsv).join(","));
  // BOM for Excel Hebrew compatibility
  return `${bom ? "\uFEFF" : ""}${lines.join("\r\n")}\r\n`;
}

export function buildPhoneContactsCsv(tenants: Tenant[]): string {
  const headers = ["Name", "Phone", "Notes"];
  const rows = tenants
    .filter((t) => t.phone)
    .map((t) => [`דירה ${t.apartment} - ${t.name}`, t.phone, `דירה ${t.apartment}`]);
  return toCsv(headers, rows);
}

export function buildPhoneContactsVcf(tenants: Tenant[], projectAddress = ""): string {
  const blocks: string[] = [];
  for (const t of tenants) {
    if (!t.phone) continue;
    const namePart = t.name?.trim() || "";
    const aptPart = t.apartment ? `דירה ${t.apartment}` : "";
    const addrPart = projectAddress.trim();
    const fullName = [namePart, aptPart, addrPart].filter(Boolean).join(" ");
    blocks.push(
      [
        "BEGIN:VCARD",
        "VERSION:3.0",
        `N;CHARSET=utf-8:;${fullName}`,
        `FN;CHARSET=utf-8:${fullName}`,
        `TEL;CELL:${t.phone}`,
        "END:VCARD",
      ].join("\r\n"),
    );
  }
  return blocks.join("\r\n\r\n") + "\r\n";
}

export function buildEmailContactsVcf(tenants: Tenant[], projectAddress = ""): string {
  const blocks: string[] = [];
  for (const t of tenants) {
    if (!t.email) continue;
    const namePart = t.name?.trim() || "";
    const aptPart = t.apartment ? `דירה ${t.apartment}` : "";
    const addrPart = projectAddress.trim();
    const fullName = [aptPart, namePart, addrPart].filter(Boolean).join(" ");
    blocks.push(
      [
        "BEGIN:VCARD",
        "VERSION:3.0",
        `N;CHARSET=utf-8:;${fullName}`,
        `FN;CHARSET=utf-8:${fullName}`,
        `EMAIL;TYPE=INTERNET:${t.email}`,
        ...(t.phone ? [`TEL;CELL:${t.phone}`] : []),
        "END:VCARD",
      ].join("\r\n"),
    );
  }
  return blocks.join("\r\n\r\n") + "\r\n";
}

export function downloadVcf(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/vcard;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function buildEmailContactsCsv(tenants: Tenant[], projectAddress = ""): string {
  // Exact Outlook contacts export/import format (Outlook / People CSV).
  const headers = [
    "First Name",
    "Middle Name",
    "Last Name",
    "Title",
    "Suffix",
    "Nickname",
    "Given Yomi",
    "Surname Yomi",
    "E-mail Address",
    "E-mail 2 Address",
    "E-mail 3 Address",
    "Home Phone",
    "Home Phone 2",
    "Business Phone",
    "Business Phone 2",
    "Mobile Phone",
    "Car Phone",
    "Other Phone",
    "Primary Phone",
    "Pager",
    "Business Fax",
    "Home Fax",
    "Other Fax",
    "Company Main Phone",
    "Callback",
    "Radio Phone",
    "Telex",
    "TTY/TDD Phone",
    "IMAddress",
    "Job Title",
    "Department",
    "Company",
    "Office Location",
    "Manager's Name",
    "Assistant's Name",
    "Assistant's Phone",
    "Company Yomi",
    "Business Street",
    "Business City",
    "Business State",
    "Business Postal Code",
    "Business Country/Region",
    "Home Street",
    "Home City",
    "Home State",
    "Home Postal Code",
    "Home Country/Region",
    "Other Street",
    "Other City",
    "Other State",
    "Other Postal Code",
    "Other Country/Region",
    "Personal Web Page",
    "Spouse",
    "Schools",
    "Hobby",
    "Location",
    "Web Page",
    "Birthday",
    "Anniversary",
    "Notes",
  ];
  const rows = tenants.map((t) => {
    const { first, last } = splitName(t.name);
    const row = new Array(headers.length).fill("");
    row[headers.indexOf("First Name")] = first || t.name?.trim() || "";
    row[headers.indexOf("Last Name")] = last;
    row[headers.indexOf("E-mail Address")] = t.email?.trim() || "";
    row[headers.indexOf("Mobile Phone")] = t.phone?.trim() || "";
    return row;
  });
  // Outlook's own exported CSV uses UTF-8 with BOM; this preserves Hebrew names and maps fields correctly.
  return toCsv(headers, rows, { bom: true });
}

// Encodes a string to Windows-1255 (Hebrew) bytes.
// Outlook's CSV import on Hebrew Windows expects this code page, not UTF-8.
function encodeWindows1255(input: string): Uint8Array {
  const bytes: number[] = [];
  for (const ch of input) {
    const code = ch.codePointAt(0)!;
    if (code < 0x80) bytes.push(code);
    else if (code >= 0x05D0 && code <= 0x05EA) bytes.push(code - 0x05D0 + 0xE0);
    else if (code >= 0x05B0 && code <= 0x05C2) bytes.push(code - 0x05B0 + 0xC0);
    else if (code === 0x20AC) bytes.push(0x80);
    else if (code === 0x201A) bytes.push(0x82);
    else if (code === 0x0192) bytes.push(0x83);
    else if (code === 0x201E) bytes.push(0x84);
    else if (code === 0x2026) bytes.push(0x85);
    else if (code === 0x2020) bytes.push(0x86);
    else if (code === 0x2021) bytes.push(0x87);
    else if (code === 0x02C6) bytes.push(0x88);
    else if (code === 0x2030) bytes.push(0x89);
    else if (code === 0x2039) bytes.push(0x8B);
    else if (code === 0x2018) bytes.push(0x91);
    else if (code === 0x2019) bytes.push(0x92);
    else if (code === 0x201C) bytes.push(0x93);
    else if (code === 0x201D) bytes.push(0x94);
    else if (code === 0x2022) bytes.push(0x95);
    else if (code === 0x2013) bytes.push(0x96);
    else if (code === 0x2014) bytes.push(0x97);
    else if (code === 0x02DC) bytes.push(0x98);
    else if (code === 0x2122) bytes.push(0x99);
    else if (code === 0x203A) bytes.push(0x9B);
    else if (code >= 0xA0 && code <= 0xBE) bytes.push(code);
    else if (code === 0x00D7) bytes.push(0xAA);
    else if (code === 0x00F7) bytes.push(0xBA);
    else if (code === 0x05F0) bytes.push(0xD4);
    else if (code === 0x05F1) bytes.push(0xD5);
    else if (code === 0x05F2) bytes.push(0xD6);
    else if (code === 0x05F3) bytes.push(0xD7);
    else if (code === 0x05F4) bytes.push(0xD8);
    else if (code === 0x200E) bytes.push(0xFD);
    else if (code === 0x200F) bytes.push(0xFE);
    else bytes.push(0x3F);
  }
  return new Uint8Array(bytes);
}

export function downloadOutlookCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function buildZohoApartmentsCsv(tenants: Tenant[], projectAddress = ""): string {
  // Matches the exact Hebrew column format Zoho expects for apartments import
  const headers = [
    "דירות מקושרות",
    "שם בעל דירה",
    "סוג דייר",
    "פרויקט מקושר- להעתיק שם מהZOHO",
  ];
  const addr = (projectAddress || "").trim();
  const rows = tenants.map((t) => {
    const { first, last } = splitName(t.name);
    const contactName = [last, first].filter(Boolean).join(" ") || t.name || "";
    const aptAddress = t.apartment ? `דירה ${t.apartment}${addr ? " " + addr : ""}` : addr;
    return [aptAddress, contactName, "דייר", addr];
  });
  return toCsv(headers, rows);
}

function splitName(full: string): { first: string; last: string } {
  const name = (full || "").trim();
  if (!name) return { first: "", last: "" };
  const idx = name.indexOf(" ");
  if (idx === -1) return { first: name, last: "" };
  return { first: name.slice(0, idx).trim(), last: name.slice(idx + 1).trim() };
}

export function buildZohoContactsCsv(tenants: Tenant[], projectAddress = ""): string {
  // Matches the exact Hebrew column format Zoho expects (per the user's sample file)
  const headers = [
    "שם פרטי",
    "שם משפחה",
    "שם איש קשר",
    "נייד",
    "טלפון אחר",
    "דוא\"ל",
    "דוא״ל משני",
    "סוג (דייר/נציגות/שוכר)",
    "סוג איש קשר",
    "כתובת הדירה -",
    "הערות",
  ];
  const addr = (projectAddress || "").trim();
  const rows = tenants.map((t) => {
    const { first, last } = splitName(t.name);
    const contactName = [last, first].filter(Boolean).join(" ") || t.name || "";
    const aptAddress = t.apartment ? `דירה ${t.apartment}${addr ? " " + addr : ""}` : addr;
    return [first, last, contactName, t.phone || "", "", t.email || "", "", "דייר", "דייר", aptAddress, ""];
  });
  return toCsv(headers, rows);
}

export function downloadCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function downloadTenantsXlsx(
  tenants: Tenant[],
  projectAddress: string,
  filename: string,
) {
  const XLSX = await import("xlsx");

  // Extract building number from project address (first numeric token), default empty
  const buildingMatch = (projectAddress || "").match(/\d+/);
  const building = buildingMatch ? buildingMatch[0] : "";

  const title = `אתר תמ"א 38 א' ${projectAddress || ""} - אלפון דיירים`.trim();
  const headers = [
    "בניין",
    "מס' דירה",
    "פרטי בעלי הדירה",
    "טלפון",
    "e-mail כתובת",
    "מייל נוסף",
    "טלפון",
    "הערות",
  ];
  const dataRows = tenants.map((t) => [
    building,
    t.apartment || "",
    t.name || "",
    t.phone || "",
    t.email || "",
    "",
    "",
    "",
  ]);

  // Build sheet with title row + blank + headers + data
  const aoa: (string | number)[][] = [
    [title],
    [],
    headers,
    ...dataRows,
  ];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = [
    { wch: 8 },
    { wch: 10 },
    { wch: 24 },
    { wch: 16 },
    { wch: 28 },
    { wch: 28 },
    { wch: 16 },
    { wch: 22 },
  ];
  // Merge title across all columns
  ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } }];
  ws["!sheetViews"] = [{ RTL: true }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "אלפון דיירים");
  XLSX.writeFile(wb, filename);
}
