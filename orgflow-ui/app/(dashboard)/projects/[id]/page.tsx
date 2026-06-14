"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect } from "react";

import { useProjectWorkspace } from "@/hooks/useProjectWorkspace";
import { useEffectiveRole } from "@/hooks/useEffectiveRole";
import { useOrgQuery } from "@/hooks/useOrgQuery";

import Badge from "@/components/ui/Badge";
import LoadingState from "@/components/ui/LoadingState";
import PageLoadingOverlay from "@/components/ui/PageLoadingOverlay";
import ProjectFieldReportLink from "@/components/field-reports/ProjectFieldReportLink";
import ProjectActivityTimeline from "@/components/projects/ProjectActivityTimeline";
import ProjectVisitIssueDiffSummary from "@/components/quality-issues/ProjectVisitIssueDiffSummary";

import ProjectDetailsEditor from "@/components/projects/ProjectDetailsEditor";
import ProjectDocumentsArchive from "@/components/projects/ProjectDocumentsArchive";
import { isContractorLimitedProjectView } from "@/lib/auth/contractor-project-view";
import { canEditProjects } from "@/lib/auth/permissions";
import { listProjectFieldVisitReports } from "@/lib/field-reports/project-visits";
import { listProjectQualityIssues } from "@/lib/quality-issues/api";
import { hasQCPermission } from "@/lib/quality-issues/permissions";
import {
  isVisibleToResident,
  type QualityIssue,
  type QualityIssueStatus,
} from "@/lib/quality-issues/types";

const OPEN_ISSUE_STATUSES: ReadonlySet<QualityIssueStatus> = new Set([
  "OPEN",
  "IN_REMEDIATION",
  "PENDING_VERIFICATION",
  "REOPENED",
]);

function isOpenPublishedIssue(issue: QualityIssue): boolean {
  return (
    isVisibleToResident(issue.visibility)
    && OPEN_ISSUE_STATUSES.has(issue.status)
  );
}

function countProjectSupervisionKpis(issues: QualityIssue[]) {
  const openPublished = issues.filter(isOpenPublishedIssue);

  return {
    openTotal: openPublished.length,
    openCritical: openPublished.filter(
      (issue) => issue.severity === "CRITICAL"
    ).length,
  };
}

export default function ProjectDetailsPage() {
  const params = useParams();
  const projectId = params.id as string;
  const effectiveRole = useEffectiveRole();
  const contractorLimitedView = isContractorLimitedProjectView(effectiveRole);
  const canReadIssues = hasQCPermission(effectiveRole, "quality_issues:read");

  const {
    project,
    activities,
    loading,
    isValidating,
    reloadWorkspace,
  } = useProjectWorkspace(projectId);

  const loadIssues = useCallback(async () => {
    return listProjectQualityIssues(projectId, { limit: 500, offset: 0 });
  }, [projectId]);

  const loadFieldReports = useCallback(async () => {
    return listProjectFieldVisitReports(projectId);
  }, [projectId]);

  const { data: issuesResponse } = useOrgQuery(
    `projects/${projectId}/supervision-kpis/issues`,
    loadIssues,
    {
      enabled: canReadIssues && !contractorLimitedView,
      showErrorToast: false,
    }
  );

  const { data: fieldReportsResponse } = useOrgQuery(
    `projects/${projectId}/supervision-kpis/field-reports`,
    loadFieldReports,
    {
      enabled: !contractorLimitedView,
      showErrorToast: false,
    }
  );

  useEffect(() => {
    if (!loading) {
      window.scrollTo({ top: 0, left: 0 });
    }
  }, [loading, projectId]);

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
        <LoadingState message="טוען פרויקט..." />
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

  const supervisionKpis = countProjectSupervisionKpis(
    issuesResponse?.items ?? []
  );
  const fieldReportCount = fieldReportsResponse?.reports.length ?? 0;

  return (
    <main className="of-dashboard-page">
      {isValidating ? <PageLoadingOverlay /> : null}

      <div className="of-card of-card-p10 of-card-xl shadow-sm">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="of-page-title">
              {project.project_name}
            </h1>

            <p className="of-page-desc mt-4">
              {contractorLimitedView
                ? "ליקויים פתוחים לטיפול בפרויקט"
                : "סביבת פיקוח הנדסי"}
            </p>

            {contractorLimitedView ? null : (
              <div className="mt-3">
                <ProjectFieldReportLink projectId={projectId} />
              </div>
            )}
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
            value={
              new Date(project.created_at).toLocaleDateString("he-IL")
            }
          />
        </div>
      </div>

      <ProjectVisitIssueDiffSummary
        projectId={projectId}
        role={effectiveRole}
      />

      {contractorLimitedView ? null : (
        <>
          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
            <KpiCard
              title="ליקויים פתוחים (שפורסמו)"
              value={supervisionKpis.openTotal}
            />
            <KpiCard
              title="קריטיים פתוחים"
              value={supervisionKpis.openCritical}
              danger={supervisionKpis.openCritical > 0}
            />
            <KpiCard
              title="דוחות שטח"
              value={fieldReportCount}
            />
          </div>

          <div className="mt-6">
            <Link
              href={`/projects/${encodeURIComponent(projectId)}/issues`}
              className="text-sm font-medium text-brand hover:underline dark:text-brand-light"
            >
              צפייה בכל הליקויים שפורסמו
            </Link>
          </div>

          <ProjectDocumentsArchive projectId={projectId} />

          <div className="mt-10">
            <ProjectActivityTimeline activities={activities} />
          </div>
        </>
      )}
    </main>
  );
}

type KpiCardProps = {
  title: string;
  value: number;
  danger?: boolean;
};

function KpiCard({ title, value, danger }: KpiCardProps) {
  return (
    <div
      className={`of-kpi-card ${
        danger ? "border-red-200 dark:border-red-900" : ""
      }`}
    >
      <p
        className={`mb-3 [unicode-bidi:plaintext] ${
          danger ? "text-red-500" : "text-zinc-500"
        }`}
        dir="rtl"
      >
        {title}
      </p>

      <h2
        className={`text-5xl font-black [unicode-bidi:isolate] ${
          danger ? "text-red-600" : ""
        }`}
        dir="ltr"
      >
        {value}
      </h2>
    </div>
  );
}

type InfoCardProps = {
  title: string;
  value: string;
};

function InfoCard({ title, value }: InfoCardProps) {
  return (
    <div className="rounded-2xl bg-zinc-50 p-6 dark:bg-zinc-800/50">
      <h3 className="mb-3 font-semibold">
        {title}
      </h3>
      <p>{value}</p>
    </div>
  );
}
