"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import ProjectTabs from "@/app/components/project-tabs";
import Button from "@/components/ui/Button";
import LoadingState from "@/components/ui/LoadingState";
import { useEffectiveRole } from "@/hooks/useEffectiveRole";
import { useTenantManagerModule } from "@/hooks/useTenantManagerModule";
import { listProjectApartments } from "@/lib/apartments/api";
import type { ProjectApartment } from "@/lib/apartments/types";

const INVITE_STATUS_LABELS: Record<string, string> = {
  none: "לא הוזמן",
  pending: "ממתין להפעלה",
  active: "פעיל",
};

export default function ProjectApartmentsPage() {
  const params = useParams();
  const projectId = typeof params?.id === "string" ? params.id : "";
  const role = useEffectiveRole();
  const { isEnabled, loading: moduleLoading } = useTenantManagerModule();
  const [apartments, setApartments] = useState<ProjectApartment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const rows = await listProjectApartments(projectId);
      setApartments(rows);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "שגיאה בטעינת רשימת הדירות"
      );
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (isEnabled) {
      void load();
    } else {
      setLoading(false);
    }
  }, [isEnabled, load]);

  if (moduleLoading || loading) {
    return (
      <div className="of-container mx-auto max-w-5xl p-8">
        <LoadingState message="טוען רשימת דירות..." variant="spinner" />
      </div>
    );
  }

  if (!isEnabled) {
    return (
      <div className="of-container mx-auto max-w-5xl space-y-4 p-8">
        <h1 className="of-page-title text-2xl">דיירים בפרויקט</h1>
        <p className="text-sm text-zinc-500">
          מודול מנהל דיירים אינו מופעל עבור הארגון.
        </p>
      </div>
    );
  }

  return (
    <div className="of-dashboard-page of-container mx-auto max-w-5xl space-y-8">
      <header>
        <h1 className="of-page-title text-2xl md:text-3xl">דיירים בפרויקט</h1>
        <p className="of-page-desc text-sm">
          רשימת דירות ופרטי בעלי הדירות. לחץ על מספר דירה לצפייה בתיק ההנדסי.
        </p>
      </header>

      <ProjectTabs projectId={projectId} role={role} />

      {error ? (
        <div className="space-y-3">
          <p className="text-sm text-red-600">{error}</p>
          <Button variant="secondary" onClick={() => void load()}>
            נסה שוב
          </Button>
        </div>
      ) : null}

      {apartments.length === 0 ? (
        <div className="of-card of-card-p6">
          <p className="text-sm text-zinc-500">
            אין דירות רשומות בפרויקט. ייבא דיירים דרך{" "}
            <Link href="/tenants" className="text-brand hover:underline">
              מנהל דיירים
            </Link>
            .
          </p>
        </div>
      ) : (
        <div className="of-card of-card-p6 max-h-[70vh] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-[var(--of-color-surface)]">
              <tr className="border-b text-right">
                <th className="px-3 py-2 font-medium">דירה</th>
                <th className="px-3 py-2 font-medium">בעל דירה</th>
                <th className="px-3 py-2 font-medium">טלפון</th>
                <th className="px-3 py-2 font-medium">מייל</th>
                <th className="px-3 py-2 font-medium">חשבון</th>
              </tr>
            </thead>
            <tbody>
              {apartments.map((apartment) => (
                <tr
                  key={apartment.id}
                  className="border-b border-zinc-200/60 last:border-0 dark:border-zinc-700/60"
                >
                  <td className="px-3 py-3">
                    <Link
                      href={`/projects/${projectId}/apartments/${apartment.id}`}
                      className="font-semibold text-brand hover:underline"
                    >
                      {apartment.apartment_number}
                    </Link>
                  </td>
                  <td className="px-3 py-3">{apartment.owner_name}</td>
                  <td className="px-3 py-3">{apartment.phone || "—"}</td>
                  <td className="px-3 py-3">{apartment.email || "—"}</td>
                  <td className="px-3 py-3">
                    {INVITE_STATUS_LABELS[apartment.invite_status] ||
                      apartment.invite_status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
