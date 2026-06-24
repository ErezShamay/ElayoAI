"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import Button from "@/components/ui/Button";
import LoadingState from "@/components/ui/LoadingState";
import ProjectApartmentsTable from "@/components/apartments/ProjectApartmentsTable";
import { useTenantManagerModule } from "@/hooks/useTenantManagerModule";
import { listProjectApartments } from "@/lib/apartments/api";
import type { ProjectApartment } from "@/lib/apartments/types";

export default function ProjectApartmentsPage() {
  const params = useParams();
  const projectId = typeof params?.id === "string" ? params.id : "";
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
          רשימת דירות ופרטי בעלי הדירות. לחץ על מספר דירה לצפייה בתיק ההנדסי,
          או על «עריכה» לעדכון פרטי הדייר.
        </p>
      </header>

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
        <ProjectApartmentsTable
          projectId={projectId}
          apartments={apartments}
          onApartmentsChange={setApartments}
        />
      )}
    </div>
  );
}
