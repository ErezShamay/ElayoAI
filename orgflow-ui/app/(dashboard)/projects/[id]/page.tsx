"use client";

import { useParams } from "next/navigation";
import { useEffect } from "react";

import { useProjectWorkspace } from "@/hooks/useProjectWorkspace";
import { useEffectiveRole } from "@/hooks/useEffectiveRole";

import Badge from "@/components/ui/Badge";
import LoadingState from "@/components/ui/LoadingState";
import PageLoadingOverlay from "@/components/ui/PageLoadingOverlay";
import ProjectFieldReportLink from "@/components/field-reports/ProjectFieldReportLink";
import ProjectActivityTimeline from "@/components/projects/ProjectActivityTimeline";
import ProjectVisitIssueDiffSummary from "@/components/quality-issues/ProjectVisitIssueDiffSummary";

import ProjectDetailsEditor from "@/components/projects/ProjectDetailsEditor";
import ProjectInsightsPanel from "@/components/projects/ProjectInsightsPanel";
import ProjectDocumentsArchive from "@/components/projects/ProjectDocumentsArchive";
import {
  AI_REVIEWS_KPI_LABEL,
  normalizeRtlOperationalSummary,
} from "@/lib/ui/bidi-text";
import { isContractorLimitedProjectView } from "@/lib/auth/contractor-project-view";
import { canEditProjects } from "@/lib/auth/permissions";

export default function ProjectDetailsPage() {

  const params = useParams();

  const projectId =
    params.id as string;

  const effectiveRole = useEffectiveRole();
  const contractorLimitedView = isContractorLimitedProjectView(effectiveRole);

  const {
    project,
    reviews,
    activities,
    insights,

    summary,
    health,
    operationalSummary,
    operationalSummaryLoading,

    loading,
    isValidating,

    reloadWorkspace,

  } = useProjectWorkspace(
    projectId
  );

  useEffect(() => {
    if (!loading) {
      window.scrollTo({ top: 0, left: 0 });
    }
  }, [loading, projectId]);

  function getStatusLabel(
    status: string
  ) {

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

  return (

    <main className="of-dashboard-page">
      {isValidating ? <PageLoadingOverlay /> : null}

      {/* PROJECT HEADER */}

      <div className="of-card of-card-p10 of-card-xl shadow-sm">

        <div
          className="
            flex
            justify-between
            items-start
            mb-8
          "
        >

          <div>

            <h1 className="of-page-title">
              {project.project_name}
            </h1>

            <p className="of-page-desc mt-4">
              {contractorLimitedView
                ? "ליקויים פתוחים לטיפול בפרויקט"
                : "סביבת עבודה תפעולית לפרויקט"}
            </p>

            {contractorLimitedView ? null : (
              <div className="mt-3">
                <ProjectFieldReportLink projectId={projectId} />
              </div>
            )}

          </div>

          <Badge variant="success">
            {getStatusLabel(
              project.status
            )}
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
              new Date(
                project.created_at
              ).toLocaleDateString(
                "he-IL"
              )
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
      {/* KPI CARDS */}

      <div
        className="
          grid
          grid-cols-1
          md:grid-cols-2
          xl:grid-cols-4
          gap-6
          mt-10
        "
      >

        <KpiCard
          title={AI_REVIEWS_KPI_LABEL}
          value={summary.reviews_count}
        />

        <KpiCard
          title="פעולות פתוחות"
          value={summary.actions_count}
        />

        <KpiCard
          title="נקודות סיכון"
          value={summary.escalations_count}
          danger
        />

        <KpiCard
          title="דוחות שהתקבלו"
          value={summary.reports_count}
        />

      </div>

      {/* HEALTH */}

      <div className="of-card of-card-p10 of-card-xl mt-10">

        <div
          className="
            flex
            justify-between
            items-center
            gap-8
            flex-wrap
          "
        >

          <div>

            <p
              className="
                text-zinc-500
                mb-3
              "
            >
              מצב הפרויקט
            </p>

            <h2
              className="
                text-4xl
                font-black
              "
            >
              {
                health.status ===
                "HEALTHY"

                  ? "יציב"

                  : health.status ===
                    "WARNING"

                  ? "דורש טיפול"

                  : "קריטי"
              }
            </h2>

          </div>

          <div
            className="
              text-center
            "
          >

            <div
              className={`
                w-32
                h-32
                rounded-full
                flex
                items-center
                justify-center
                text-4xl
                font-black

                ${
                  health.score >= 80

                    ? `
                      bg-green-100
                      text-green-700
                      dark:bg-green-900/30
                      dark:text-green-300
                    `

                    : health.score >= 50

                    ? `
                      bg-yellow-100
                      text-yellow-700
                      dark:bg-yellow-900/30
                      dark:text-yellow-300
                    `

                    : `
                      bg-red-100
                      text-red-700
                      dark:bg-red-900/30
                      dark:text-red-300
                    `
                }
              `}
            >
              {health.score}
            </div>

            <p
              className="
                mt-4
                text-zinc-500
              "
            >
              Health Score
            </p>

          </div>

        </div>

      </div>

      {/* AI OPERATIONAL SUMMARY */}

      <div className="of-card of-card-p10 of-card-xl mt-10">

        <div
          className="
            flex
            items-center
            justify-between
            mb-6
          "
        >

          <div>

            <p
              className="
                text-zinc-500
                mb-2
              "
            >
              AI Executive Summary
            </p>

            <h2
              className="
                text-3xl
                font-black
              "
            >
              סיכום תפעולי חכם
            </h2>

          </div>

        </div>

        <div
          className="
            whitespace-pre-wrap
            leading-8
            text-lg
            text-zinc-700
            dark:text-zinc-300
          "
          dir="rtl"
        >
          {
            operationalSummaryLoading
              ? "מייצר סיכום תפעולי..."
              : operationalSummary?.summary
                ? normalizeRtlOperationalSummary(
                    operationalSummary.summary
                  )
                : null
          }
        </div>

      </div>

      {/* INSIGHTS */}

      <div className="mt-10">

        <ProjectInsightsPanel
          insights={insights}
        />

      </div>

      <ProjectDocumentsArchive projectId={projectId} />

      <div className="mt-10">

        <ProjectActivityTimeline
          activities={activities}
        />

      </div>

      {/* REVIEWS */}

      <div className="mt-10">

        <h2
          className="
            text-3xl
            font-bold
            mb-6
          "
        >
          ביקורות AI בפרויקט
        </h2>

        {reviews.length === 0 && (

          <div className="of-card of-card-p8">
            אין ביקורות בפרויקט
          </div>

        )}

        <div className="grid gap-6">

          {reviews.map((review) => (

            <div
              key={review.id}
              className="of-card of-card-p8"
            >

              <div className="space-y-5">

                <div>

                  <h3
                    className="
                      font-semibold
                      mb-2
                    "
                  >
                    השפעה עסקית
                  </h3>

                  <p>
                    {review.business_impact}
                  </p>

                </div>

                <div>

                  <h3
                    className="
                      font-semibold
                      mb-2
                    "
                  >
                    סיכון לדיירים
                  </h3>

                  <p>
                    {review.tenant_risk}
                  </p>

                </div>

                <div>

                  <h3
                    className="
                      font-semibold
                      mb-2
                    "
                  >
                    פעולה מומלצת
                  </h3>

                  <p>
                    {review.recommended_action}
                  </p>

                </div>

              </div>

            </div>

          ))}

        </div>

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

function KpiCard({
  title,
  value,
  danger,
}: KpiCardProps) {

  return (

    <div
      className={`
        of-kpi-card

        ${
          danger
            ? "border-red-200 dark:border-red-900"
            : ""
        }
      `}
    >

      <p
        className={`
          mb-3
          [unicode-bidi:plaintext]

          ${
            danger
              ? "text-red-500"
              : "text-zinc-500"
          }
        `}
        dir="rtl"
      >
        {title}
      </p>

      <h2
        className={`
          text-5xl
          font-black
          [unicode-bidi:isolate]

          ${
            danger
              ? "text-red-600"
              : ""
          }
        `}
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

function InfoCard({
  title,
  value,
}: InfoCardProps) {

  return (

    <div
      className="
        bg-zinc-50
        dark:bg-zinc-800/50
        rounded-2xl
        p-6
      "
    >

      <h3
        className="
          font-semibold
          mb-3
        "
      >
        {title}
      </h3>

      <p>{value}</p>

    </div>

  );
}
