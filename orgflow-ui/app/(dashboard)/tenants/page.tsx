"use client";

import { useState } from "react";

import TenantExportCards from "@/components/tenants/TenantExportCards";
import TenantFileUploader from "@/components/tenants/TenantFileUploader";
import TenantMergeUploader from "@/components/tenants/TenantMergeUploader";
import TenantTable from "@/components/tenants/TenantTable";
import type { Tenant } from "@/lib/tenants/types";

type UploadMode = "single" | "merge";

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [projectAddress, setProjectAddress] = useState("פינלס 9 תל אביב");
  const [mode, setMode] = useState<UploadMode>("single");

  const withPhone = tenants.filter((t) => t.phone).length;
  const withEmail = tenants.filter((t) => t.email).length;

  return (
    <div className="mx-auto max-w-5xl space-y-10 p-6 md:p-8">
      <header>
        <h1 className="text-2xl font-bold md:text-3xl">מנהל דיירים</h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-500">
          העלה קובץ Excel של רשימת דיירים — המערכת תחלץ את הנתונים, תאפשר עריכה,
          ותפיק 4 קבצי ייבוא: טלפון (VCF), מייל (CSV), דירות לזוהו, אנשי קשר
          לזוהו.
        </p>
      </header>

      <section>
        <SectionTitle step="1" title="העלאת קובץ" />
        <div className="mb-4 grid grid-cols-2 gap-2 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-900">
          <button
            type="button"
            onClick={() => setMode("single")}
            className={`rounded-lg px-3 py-2 text-sm font-medium ${
              mode === "single"
                ? "bg-white shadow dark:bg-zinc-800"
                : "text-zinc-500"
            }`}
          >
            קובץ אחד
          </button>
          <button
            type="button"
            onClick={() => setMode("merge")}
            className={`rounded-lg px-3 py-2 text-sm font-medium ${
              mode === "merge"
                ? "bg-white shadow dark:bg-zinc-800"
                : "text-zinc-500"
            }`}
          >
            איחוד שני קבצים
          </button>
        </div>
        {mode === "single" ? (
          <TenantFileUploader onTenants={setTenants} />
        ) : (
          <TenantMergeUploader onTenants={setTenants} />
        )}
      </section>

      {tenants.length > 0 && (
        <>
          <section className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5">
            <h3 className="font-semibold">החילוץ הושלם</h3>
            <p className="mt-1 text-sm text-zinc-500">
              {tenants.length} דיירים · {withPhone} עם טלפון · {withEmail} עם
              מייל
            </p>
          </section>

          <section>
            <SectionTitle step="2" title="עריכה ואישור" />
            <TenantTable tenants={tenants} onChange={setTenants} />
          </section>

          <section>
            <SectionTitle step="3" title="כתובת הפרויקט" />
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
              <label className="mb-2 block text-sm font-medium">
                כתובת הפרויקט (תופיע בכל איש קשר ב-VCF ובייצוא לזוהו)
              </label>
              <input
                type="text"
                value={projectAddress}
                onChange={(e) => setProjectAddress(e.target.value)}
                placeholder="לדוגמה: פינלס 9 תל אביב"
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-900"
              />
            </div>
          </section>

          <section>
            <SectionTitle step="4" title="הפקת הקבצים" />
            <TenantExportCards
              tenants={tenants}
              projectAddress={projectAddress}
            />
          </section>
        </>
      )}
    </div>
  );
}

function SectionTitle({ step, title }: { step: string; title: string }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-sm font-bold text-white dark:bg-white dark:text-zinc-900">
        {step}
      </div>
      <h2 className="text-xl font-semibold">{title}</h2>
    </div>
  );
}
