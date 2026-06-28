"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useProjectWorkspace } from "@/hooks/useProjectWorkspace";
import { useEffectiveRole } from "@/hooks/useEffectiveRole";

import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import LoadingState from "@/components/ui/LoadingState";
import PageLoadingOverlay from "@/components/ui/PageLoadingOverlay";
import DeleteProjectDialog from "@/components/projects/DeleteProjectDialog";
import ProjectActivityTimeline from "@/components/projects/ProjectActivityTimeline";
import ProjectDetailsEditor from "@/components/projects/ProjectDetailsEditor";
import ProjectDocumentsArchive from "@/components/projects/ProjectDocumentsArchive";
import { canDeleteProjects, canEditProjects } from "@/lib/auth/permissions";
import { deleteProjectPermanently } from "@/lib/projects/delete-project-api";
import { showToast } from "@/lib/ui/toast";

export default function ProjectSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const effectiveRole = useEffectiveRole();
  const canDeleteProject = canDeleteProjects(effectiveRole);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmValue, setDeleteConfirmValue] = useState("");
  const [deletingProject, setDeletingProject] = useState(false);

  const {
    project,
    activities,
    loading,
    isValidating,
    reloadWorkspace,
  } = useProjectWorkspace(projectId);

  useEffect(() => {
    if (!loading) {
      window.scrollTo({ top: 0, left: 0 });
    }
  }, [loading, projectId]);

  function closeDeleteDialog() {
    if (deletingProject) {
      return;
    }

    setShowDeleteDialog(false);
    setDeleteConfirmValue("");
  }

  async function handleDeleteProject() {
    if (!project) {
      return;
    }

    const requiredName = project.project_name.trim();
    if (deleteConfirmValue.trim() !== requiredName) {
      showToast("יש להקליד את שם הפרויקט בדיוק כפי שמוצג", "error");
      return;
    }

    try {
      setDeletingProject(true);
      await deleteProjectPermanently(projectId, deleteConfirmValue.trim());
      showToast("הפרויקט נמחק מהמערכת", "success");
      router.push("/projects");
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "מחיקת הפרויקט נכשלה",
        "error"
      );
    } finally {
      setDeletingProject(false);
    }
  }

  function getStatusLabel(status: string) {
    switch (status) {
      case "ACTIVE":
        return "פעיל";
      case "COMPLETED":
        return "הושלם";
      default:
        return status;
    }
  }

  if (loading && !project) {
    return (
      <main className="of-dashboard-page">
        <LoadingState message="טוען הגדרות פרויקט..." />
      </main>
    );
  }

  if (!project) {
    return (
      <main className="of-dashboard-page">
        פרויקט לא נמצא
      </main>
    );
  }

  return (
    <main className="of-dashboard-page">
      {isValidating ? <PageLoadingOverlay /> : null}

      <div className="mb-6">
        <Link
          href={`/projects/${encodeURIComponent(projectId)}`}
          className="text-sm font-medium text-brand hover:underline dark:text-brand-light"
        >
          חזרה לדשבורד הפרויקט
        </Link>
      </div>

      <div className="of-card of-card-p10 of-card-xl shadow-sm">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="of-page-title">הגדרות פרויקט</h1>
            <p className="of-page-desc mt-4">
              {project.project_name} — פרטי יזם, קבלן ועורך
            </p>
          </div>

          <Badge variant="success">
            {getStatusLabel(project.status)}
          </Badge>
        </div>

        <ProjectDetailsEditor
          project={project}
          canEdit={canEditProjects(effectiveRole)}
          onSaved={() => reloadWorkspace({ silent: true })}
        />

        <div className="mt-6">
          <InfoCard
            title="תאריך יצירה"
            value={new Date(project.created_at).toLocaleDateString("he-IL")}
          />
        </div>
      </div>

      <ProjectDocumentsArchive projectId={projectId} />

      {canDeleteProject ? (
        <div className="of-card of-card-p10 of-card-xl mt-10 border border-red-200/80 shadow-sm dark:border-red-900/50">
          <h2 className="text-lg font-semibold text-red-800 dark:text-red-300">
            אזור מסוכן
          </h2>
          <p className="of-page-desc mt-3">
            מחיקת הפרויקט לצמיתות — כולל כל הדאטה, הליקויים והדוחות
            הקשורים אליו. פעולה זו אינה ניתנת לביטול.
          </p>
          <div className="mt-6">
            <Button
              type="button"
              variant="danger"
              disabled={deletingProject}
              onClick={() => setShowDeleteDialog(true)}
            >
              מחיקת פרויקט לצמיתות
            </Button>
          </div>
        </div>
      ) : null}

      <DeleteProjectDialog
        open={showDeleteDialog}
        projectName={project.project_name}
        confirmValue={deleteConfirmValue}
        deleting={deletingProject}
        onConfirmValueChange={setDeleteConfirmValue}
        onCancel={closeDeleteDialog}
        onConfirm={handleDeleteProject}
      />

      <div className="mt-10">
        <ProjectActivityTimeline activities={activities} />
      </div>
    </main>
  );
}

type InfoCardProps = {
  title: string;
  value: string;
};

function InfoCard({ title, value }: InfoCardProps) {
  return (
    <div className="rounded-2xl bg-zinc-50 p-6 dark:bg-zinc-800/50">
      <h3 className="mb-3 font-semibold">{title}</h3>
      <p>{value}</p>
    </div>
  );
}
