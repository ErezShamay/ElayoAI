"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  FormEvent,
  startTransition,
  useCallback,
  useEffect,
  useState,
} from "react";

import Button from "@/components/ui/Button";
import { apiFetch } from "@/lib/api/client";
import { useFieldReportModule } from "@/hooks/useFieldReportModule";

type Project = {
  id: string;
  project_name: string;
};

type VisitType = {
  code: string;
  label_he: string;
};

export default function NewFieldVisitReportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedProjectId = searchParams.get("project");
  const { isEnabled, loading: moduleLoading } = useFieldReportModule();
  const [projects, setProjects] = useState<Project[]>([]);
  const [visitTypes, setVisitTypes] = useState<VisitType[]>([]);
  const [projectId, setProjectId] = useState("");
  const [visitType, setVisitType] = useState("");
  const [visitDate, setVisitDate] = useState(
    () => new Date().toISOString().slice(0, 10)
  );
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const loadFormData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [projectsRes, typesRes] = await Promise.all([
        apiFetch("/projects"),
        apiFetch("/field-reports/visit-types"),
      ]);

      if (!projectsRes.ok || !typesRes.ok) {
        throw new Error("טעינת נתוני הטופס נכשלה");
      }

      const projectsPayload = await projectsRes.json();
      const typesPayload = await typesRes.json();

      const projectList = Array.isArray(projectsPayload)
        ? projectsPayload
        : projectsPayload.projects || [];

      setProjects(projectList);
      setVisitTypes(typesPayload.visit_types || []);

      const defaultProjectId =
        preselectedProjectId
        && projectList.some(
          (project: Project) => project.id === preselectedProjectId
        )
          ? preselectedProjectId
          : projectList[0]?.id;

      if (defaultProjectId) {
        setProjectId(defaultProjectId);
      }

      const firstType = typesPayload.visit_types?.[0]?.code;
      if (firstType) {
        setVisitType(firstType);
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "טעינת נתוני הטופס נכשלה"
      );
    } finally {
      setLoading(false);
    }
  }, [preselectedProjectId]);

  useEffect(() => {
    if (moduleLoading || !isEnabled) {
      return;
    }

    startTransition(() => {
      void loadFormData();
    });
  }, [moduleLoading, isEnabled, loadFormData]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!projectId || !visitType || !visitDate) {
      setError("יש למלא את כל השדות");
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      const response = await apiFetch("/field-reports/visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectId,
          visit_type: visitType,
          visit_date: visitDate,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(
          payload.error?.message
            || payload.message
            || payload.detail
            || "יצירת הדוח נכשלה"
        );
      }

      const report = await response.json();
      router.push(`/field-reports/${report.id}`);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "יצירת הדוח נכשלה"
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (moduleLoading || (isEnabled && loading)) {
    return (
      <div className="of-container mx-auto max-w-xl p-8 text-sm text-zinc-500">
        טוען...
      </div>
    );
  }

  if (!isEnabled) {
    return (
      <div className="of-container mx-auto max-w-xl space-y-4 p-8">
        <h1 className="of-page-title text-2xl">דוח ביקור חדש</h1>
        <p className="text-sm text-zinc-600">
          מודול הפקת דוחות אינו מופעל עבור הארגון.
        </p>
        <Link href="/field-reports" className="text-sm text-brand hover:underline">
          חזרה
        </Link>
      </div>
    );
  }

  return (
    <div className="of-container mx-auto max-w-xl space-y-6 p-8">
      <header className="space-y-2">
        <Link
          href="/field-reports"
          className="text-sm text-brand hover:underline"
        >
          ← הדוחות שלי
        </Link>
        <h1 className="of-page-title text-2xl">דוח ביקור חדש</h1>
        <p className="of-page-desc text-sm">
          דוח שבועי אחד לפרויקט — אם קיים דוח בעבודה, יש להמשיך אותו.
        </p>
      </header>

      <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
        <label className="block space-y-1 text-sm">
          <span className="font-medium">פרויקט</span>
          <select
            className="of-input w-full"
            value={projectId}
            onChange={(event) => setProjectId(event.target.value)}
            required
          >
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.project_name}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1 text-sm">
          <span className="font-medium">סוג ביקור</span>
          <select
            className="of-input w-full"
            value={visitType}
            onChange={(event) => setVisitType(event.target.value)}
            required
          >
            {visitTypes.map((type) => (
              <option key={type.code} value={type.code}>
                {type.label_he}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1 text-sm">
          <span className="font-medium">תאריך ביקור</span>
          <input
            type="date"
            className="of-input w-full"
            value={visitDate}
            onChange={(event) => setVisitDate(event.target.value)}
            required
          />
        </label>

        {error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={submitting}>
            {submitting ? "יוצר..." : "צור דוח"}
          </Button>
          <Link href="/field-reports">
            <Button variant="secondary" type="button">
              ביטול
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
