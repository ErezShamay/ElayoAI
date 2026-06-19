"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import Button from "@/components/ui/Button";
import { apiFetch } from "@/lib/api/client";
import {
  normalizeProjectList,
  readApiErrorMessage,
} from "@/lib/api/read-error-message";
import { projectFieldReportNewPath } from "@/lib/field-reports/routes";
import { FR_TOUCH_SELECT } from "@/lib/field-reports/touch-input-class";

type Project = {
  id: string;
  project_name: string;
};

type ProjectPickerDialogProps = {
  open: boolean;
  onClose: () => void;
};

export default function ProjectPickerDialog({
  open,
  onClose,
}: ProjectPickerDialogProps) {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;

    async function loadProjects() {
      setLoading(true);
      setError("");
      setSelectedProjectId("");

      try {
        const response = await apiFetch("/projects");
        if (!response.ok) {
          throw new Error(
            await readApiErrorMessage(
              response,
              "טעינת רשימת הפרויקטים נכשלה"
            )
          );
        }

        const payload = await response.json();
        const projectList = normalizeProjectList(payload) as Project[];

        if (cancelled) {
          return;
        }

        setProjects(projectList);
        if (projectList.length === 1) {
          setSelectedProjectId(projectList[0].id);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "טעינת רשימת הפרויקטים נכשלה"
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadProjects();

    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  function handleContinue() {
    if (!selectedProjectId) {
      return;
    }

    onClose();
    router.push(projectFieldReportNewPath(selectedProjectId));
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-picker-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="project-picker-title" className="text-lg font-semibold">
          הפקת דוח
        </h2>

        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          בחר את הפרויקט שעבורו תרצה להפיק דוח שטח.
        </p>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            טוען פרויקטים...
          </div>
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : projects.length === 0 ? (
          <p className="text-sm text-zinc-600">
            לא נמצאו פרויקטים זמינים.
          </p>
        ) : (
          <div>
            <label
              htmlFor="report-project-picker"
              className="mb-2 block text-sm font-medium"
            >
              פרויקט
            </label>
            <select
              id="report-project-picker"
              value={selectedProjectId}
              onChange={(event) => setSelectedProjectId(event.target.value)}
              className={FR_TOUCH_SELECT}
            >
              <option value="">בחר פרויקט</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.project_name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex flex-wrap justify-end gap-2">
          <Button
            variant="secondary"
            type="button"
            onClick={onClose}
          >
            ביטול
          </Button>
          <Button
            type="button"
            disabled={!selectedProjectId || loading}
            onClick={handleContinue}
          >
            המשך להפקת דוח
          </Button>
        </div>
      </div>
    </div>
  );
}
