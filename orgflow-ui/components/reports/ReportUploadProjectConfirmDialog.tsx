"use client";

import Button from "@/components/ui/Button";
import type {
  UploadProjectResolution,
  UploadProjectResolutionProject,
} from "@/lib/reports/upload-project-resolver";

type ReportUploadProjectConfirmDialogProps = {
  open: boolean;
  loading: boolean;
  resolution: UploadProjectResolution | null;
  error: string;
  selectedProjectId: string;
  onSelectedProjectIdChange: (projectId: string) => void;
  onCancel: () => void;
  onConfirmExisting: (project: UploadProjectResolutionProject) => void;
  onConfirmCreate: (projectName: string) => void;
};

function projectLabel(project: UploadProjectResolutionProject): string {
  return project.project_name?.trim() || "פרויקט ללא שם";
}

export default function ReportUploadProjectConfirmDialog({
  open,
  loading,
  resolution,
  error,
  selectedProjectId,
  onSelectedProjectIdChange,
  onCancel,
  onConfirmExisting,
  onConfirmCreate,
}: ReportUploadProjectConfirmDialogProps) {
  if (!open) {
    return null;
  }

  const extractedName = resolution?.extracted_project_name?.trim() || "";
  const isExisting =
    resolution?.match_status === "EXACT_MATCH" ||
    resolution?.match_status === "MULTIPLE_MATCHES";
  const isMissing = resolution?.match_status === "NOT_FOUND";
  const candidateProjects =
    resolution?.match_status === "MULTIPLE_MATCHES"
      ? resolution.projects
      : resolution?.project
        ? [resolution.project]
        : [];

  const selectedProject =
    candidateProjects.find((project) => project.id === selectedProjectId) ??
    candidateProjects[0] ??
    null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      role="presentation"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
        role="dialog"
        aria-modal="true"
        aria-labelledby="upload-project-confirm-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="upload-project-confirm-title" className="text-lg font-semibold">
          {loading
            ? "בודק את הפרויקט מהדוח"
            : isExisting
              ? "הפרויקט כבר קיים במערכת"
              : "לא נמצא פרויקט במערכת"}
        </h2>

        {loading ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            מזהה את שם הפרויקט מתוך הדוח...
          </p>
        ) : null}

        {!loading && isExisting ? (
          <div className="space-y-3 text-sm text-zinc-600 dark:text-zinc-300">
            <p>
              הפרויקט{" "}
              <strong>{projectLabel(selectedProject ?? { id: "", project_name: extractedName })}</strong>{" "}
              כבר קיים במערכת. האם להעלות את הדוח לפרויקט הקיים?
            </p>
            {resolution?.match_status === "MULTIPLE_MATCHES" ? (
              <div>
                <label
                  htmlFor="upload-project-match-picker"
                  className="mb-2 block font-medium text-zinc-800 dark:text-zinc-100"
                >
                  בחר פרויקט מתאים
                </label>
                <select
                  id="upload-project-match-picker"
                  value={selectedProjectId}
                  onChange={(event) =>
                    onSelectedProjectIdChange(event.target.value)
                  }
                  className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 dark:border-zinc-700 dark:bg-zinc-950"
                >
                  {candidateProjects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {projectLabel(project)}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
          </div>
        ) : null}

        {!loading && isMissing ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            שימו לב: אין פרויקט
            {extractedName ? (
              <>
                {" "}
                בשם <strong>{extractedName}</strong>
              </>
            ) : null}{" "}
            במערכת. האם להגדיר פרויקט חדש?
          </p>
        ) : null}

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" type="button" onClick={onCancel}>
            ביטול
          </Button>
          {!loading && isExisting && selectedProject ? (
            <Button
              type="button"
              onClick={() => onConfirmExisting(selectedProject)}
            >
              העלה לפרויקט הקיים
            </Button>
          ) : null}
          {!loading && isMissing ? (
            <Button
              type="button"
              disabled={!extractedName}
              onClick={() => onConfirmCreate(extractedName)}
            >
              המשך להגדרת פרויקט
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
