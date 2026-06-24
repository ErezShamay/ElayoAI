"use client";

import {
  tenantImportTemplatesForMode,
  type TenantImportTemplate,
} from "@/lib/tenants/import-templates";

type TenantImportTemplateDownloadsProps = {
  mode: "single" | "merge";
};

function TemplateDownloadLink({
  template,
}: {
  template: TenantImportTemplate;
}) {
  return (
    <a
      href={template.href}
      download={template.downloadFilename}
      className="block rounded-xl border border-zinc-200/80 px-4 py-3 transition hover:border-brand/40 hover:bg-brand/5 dark:border-zinc-800"
    >
      <span className="font-medium text-brand">
        הורדת {template.label}
      </span>
      <span className="mt-1 block text-sm text-zinc-500">
        {template.description}
      </span>
    </a>
  );
}

export default function TenantImportTemplateDownloads({
  mode,
}: TenantImportTemplateDownloadsProps) {
  const templates = tenantImportTemplatesForMode(mode);

  return (
    <div className="mb-4 rounded-2xl border border-zinc-200/80 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
      <h3 className="text-sm font-semibold">תבנית CSV לדוגמה</h3>
      <p className="mt-1 text-sm text-zinc-500">
        הורידו קובץ עם כל העמודות הנדרשות (ללא שמות דיירים), מלאו את הנתונים
        ב-Excel או Google Sheets, ואז העלו את הקובץ כאן. ניתן גם לשמור כ-.xlsx
        לפני ההעלאה.
      </p>

      <div
        className={`mt-3 grid gap-2 ${
          templates.length > 1 ? "md:grid-cols-2" : ""
        }`}
      >
        {templates.map((template) => (
          <TemplateDownloadLink key={template.id} template={template} />
        ))}
      </div>

      <p className="mt-3 text-xs text-zinc-500">
        שדות חובה לייבוא: שם הדייר ומספר דירה. מייל תקין נדרש לשליחת
        הזמנה לפורטל הדייר.
      </p>
    </div>
  );
}
