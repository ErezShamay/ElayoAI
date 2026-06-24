export type TenantImportTemplateId =
  | "single"
  | "apartments"
  | "contacts";

export type TenantImportTemplate = {
  id: TenantImportTemplateId;
  href: string;
  downloadFilename: string;
  label: string;
  description: string;
};

export const TENANT_IMPORT_TEMPLATES: Record<
  TenantImportTemplateId,
  TenantImportTemplate
> = {
  single: {
    id: "single",
    href: "/templates/tenants-import-single.csv",
    downloadFilename: "elayoai-tenants-template.csv",
    label: "קובץ מלא",
    description:
      "שם הדייר, מספר דירה, בניין, כניסה, טלפון ומייל — לייבוא בקובץ אחד",
  },
  apartments: {
    id: "apartments",
    href: "/templates/tenants-import-apartments.csv",
    downloadFilename: "elayoai-tenants-apartments-template.csv",
    label: "קובץ דירות (א׳)",
    description: "שם הדייר, מספר דירה, בניין וכניסה — לאיחוד שני קבצים",
  },
  contacts: {
    id: "contacts",
    href: "/templates/tenants-import-contacts.csv",
    downloadFilename: "elayoai-tenants-contacts-template.csv",
    label: "קובץ אנשי קשר (ב׳)",
    description: "שם הדייר, טלפון ומייל — לאיחוד שני קבצים",
  },
};

export function tenantImportTemplatesForMode(
  mode: "single" | "merge"
): TenantImportTemplate[] {
  if (mode === "single") {
    return [TENANT_IMPORT_TEMPLATES.single];
  }

  return [
    TENANT_IMPORT_TEMPLATES.apartments,
    TENANT_IMPORT_TEMPLATES.contacts,
  ];
}
