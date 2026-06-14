"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import TenantExportCards from "@/components/tenants/TenantExportCards";
import TenantFileUploader from "@/components/tenants/TenantFileUploader";
import TenantMergeUploader from "@/components/tenants/TenantMergeUploader";
import TenantTable from "@/components/tenants/TenantTable";
import Button from "@/components/ui/Button";
import LoadingState from "@/components/ui/LoadingState";
import { useTenantManagerModule } from "@/hooks/useTenantManagerModule";
import {
  bulkUpsertProjectApartments,
  inviteAllApartmentResidents,
} from "@/lib/apartments/api";
import { apiFetch } from "@/lib/api/client";
import type { Tenant } from "@/lib/tenants/types";

type UploadMode = "single" | "merge";

type ProjectOption = {
  id: string;
  project_name: string;
};

export default function TenantsPage() {
  const { isEnabled, loading, error, reload } = useTenantManagerModule();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [projectAddress, setProjectAddress] = useState("פינלס 9 תל אביב");
  const [mode, setMode] = useState<UploadMode>("single");
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [saving, setSaving] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!isEnabled) return;

    void apiFetch<{ projects: ProjectOption[] }>("/projects")
      .then((response) => {
        const items = response.projects ?? [];
        setProjects(items);
        if (items.length === 1) {
          setSelectedProjectId(items[0]!.id);
        }
      })
      .catch(() => {
        setProjects([]);
      });
  }, [isEnabled]);

  const withPhone = tenants.filter((t) => t.phone).length;
  const withEmail = tenants.filter((t) => t.email).length;

  const handleSaveToProject = async () => {
    if (!selectedProjectId) {
      setActionError("יש לבחור פרויקט לפני שמירה");
      return;
    }

    setSaving(true);
    setActionError(null);
    setActionMessage(null);
    try {
      const result = await bulkUpsertProjectApartments(
        selectedProjectId,
        tenants
      );
      setActionMessage(
        `נשמרו ${result.apartments.length} דירות (${result.created} חדשות, ${result.updated} עודכנו)`
      );
    } catch (saveError) {
      setActionError(
        saveError instanceof Error ? saveError.message : "שגיאה בשמירת הדיירים"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleInviteAll = async () => {
    if (!selectedProjectId) {
      setActionError("יש לבחור פרויקט לפני שליחת הזמנות");
      return;
    }

    setInviting(true);
    setActionError(null);
    setActionMessage(null);
    try {
      await bulkUpsertProjectApartments(selectedProjectId, tenants);
      const result = await inviteAllApartmentResidents(selectedProjectId);
      setActionMessage(
        `נשלחו ${result.invited_count} הזמנות לדיירים (דולגו ${result.skipped_count})`
      );
    } catch (inviteError) {
      setActionError(
        inviteError instanceof Error
          ? inviteError.message
          : "שגיאה בשליחת הזמנות"
      );
    } finally {
      setInviting(false);
    }
  };

  if (loading) {
    return (
      <div className="of-container mx-auto max-w-5xl p-8">
        <LoadingState message="טוען מודול מנהל דיירים..." variant="spinner" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="of-container mx-auto max-w-5xl space-y-4 p-8">
        <p className="text-sm text-red-600">{error}</p>
        <Button variant="secondary" onClick={() => void reload()}>
          נסה שוב
        </Button>
      </div>
    );
  }

  if (!isEnabled) {
    return (
      <div className="of-container mx-auto max-w-5xl space-y-4 p-8">
        <h1 className="of-page-title text-2xl">מנהל דיירים</h1>
        <p className="of-page-desc text-sm">
          מודול מנהל דיירים אינו מופעל עבור הארגון הנוכחי. פנה למנהל המערכת
          להפעלה.
        </p>
        <Link href="/portfolio" className="text-sm text-brand hover:underline">
          חזרה לתיק פיקוח
        </Link>
      </div>
    );
  }

  return (
    <div className="of-dashboard-page of-container mx-auto max-w-5xl space-y-10">
      <header>
        <h1 className="of-page-title text-2xl md:text-3xl">מנהל דיירים</h1>
        <p className="of-page-desc max-w-2xl text-sm">
          העלה קובץ Excel של רשימת דיירים, ערוך את הנתונים, שמור לפרויקט ושלח
          לדיירים הזמנה עם סיסמה זמנית לאזור האישי. ניתן גם לייצא קבצי VCF/CSV
          לזוהו.
        </p>
      </header>

      <section>
        <SectionTitle step="1" title="העלאת קובץ" />
        <div className="of-card of-card-p6 mb-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setMode("single")}
            className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
              mode === "single"
                ? "of-accent-gradient rounded-xl px-3 py-2 text-sm font-medium shadow-md"
                : "of-nav-pill rounded-xl px-3 py-2 text-sm font-medium"
            }`}
          >
            קובץ אחד
          </button>
          <button
            type="button"
            onClick={() => setMode("merge")}
            className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
              mode === "merge"
                ? "of-accent-gradient rounded-xl px-3 py-2 text-sm font-medium shadow-md"
                : "of-nav-pill rounded-xl px-3 py-2 text-sm font-medium"
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
          <section className="of-card of-card-p6 border-emerald-500/30 bg-emerald-500/5">
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
            <SectionTitle step="3" title="שיוך לפרויקט ושמירה" />
            <div className="of-card of-card-p6 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium">פרויקט</label>
                <select
                  value={selectedProjectId}
                  onChange={(event) => setSelectedProjectId(event.target.value)}
                  className="of-input of-focus-ring w-full px-3 py-2 text-sm"
                >
                  <option value="">בחר פרויקט...</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.project_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={() => void handleSaveToProject()}
                  disabled={saving || inviting}
                >
                  {saving ? "שומר..." : "שמור דירות בפרויקט"}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => void handleInviteAll()}
                  disabled={saving || inviting}
                >
                  {inviting ? "שולח הזמנות..." : "שמור ושלח הזמנות לדיירים"}
                </Button>
                {selectedProjectId ? (
                  <Link
                    href={`/projects/${selectedProjectId}/apartments`}
                    className="inline-flex items-center text-sm text-brand hover:underline"
                  >
                    צפייה ברשימת הדירות בפרויקט
                  </Link>
                ) : null}
              </div>
              {actionMessage ? (
                <p className="text-sm text-emerald-700">{actionMessage}</p>
              ) : null}
              {actionError ? (
                <p className="text-sm text-red-600">{actionError}</p>
              ) : null}
            </div>
          </section>

          <section>
            <SectionTitle step="4" title="כתובת לייצוא" />
            <div className="of-card of-card-p6">
              <label className="mb-2 block text-sm font-medium">
                כתובת הפרויקט (תופיע בכל איש קשר ב-VCF ובייצוא לזוהו)
              </label>
              <input
                type="text"
                value={projectAddress}
                onChange={(e) => setProjectAddress(e.target.value)}
                placeholder="לדוגמה: פינלס 9 תל אביב"
                className="of-input of-focus-ring px-3 py-2 text-sm"
              />
            </div>
          </section>

          <section>
            <SectionTitle step="5" title="הפקת הקבצים" />
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
      <div className="of-accent-gradient flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-white">
        {step}
      </div>
      <h2 className="text-xl font-semibold">{title}</h2>
    </div>
  );
}
