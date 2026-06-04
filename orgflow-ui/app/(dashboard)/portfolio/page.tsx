"use client";

import Link from "next/link";
import { useCallback, useEffect } from "react";

import LoadingState from "@/components/ui/LoadingState";
import PageLoadingOverlay from "@/components/ui/PageLoadingOverlay";
import { useOrgQuery } from "@/hooks/useOrgQuery";
import { apiFetch } from "@/lib/api/client";
import { DEFAULT_QUERY_TTL_MS } from "@/lib/ui/query-cache";

type Prediction = {
  prediction: string;
  risk_score: number;
  message: string;
};

type PortfolioProject = {
  project_id: string;
  project_name: string;

  health: {
    score: number;
    status: string;
  };

  summary: {
    actions_count: number;
    escalations_count: number;
    reviews_count: number;
  };

  prediction: Prediction;
};

type PortfolioResponse = {
  projects: PortfolioProject[];

  critical_projects: number;

  total_projects: number;

  total_actions: number;

  total_escalations: number;

  average_health_score: number;
};

export default function PortfolioPage() {
  const loadPortfolio = useCallback(async () => {
    const response = await apiFetch("/portfolio/summary");

    if (!response.ok) {
      throw new Error("Failed loading portfolio");
    }

    return (await response.json()) as PortfolioResponse;
  }, []);

  const {
    data: portfolio,
    loading,
    isValidating,
    reload,
  } = useOrgQuery("portfolio/summary", loadPortfolio, {
    ttlMs: DEFAULT_QUERY_TTL_MS,
  });

  useEffect(() => {
    const pollingInterval =
      Number(process.env.NEXT_PUBLIC_POLLING_INTERVAL)
      || 30000;

    const interval = setInterval(() => {
      void reload();
    }, pollingInterval);

    return () => {
      clearInterval(interval);
    };
  }, [reload]);

  if (loading && !portfolio) {
    return (
      <main className="of-dashboard-page">
        <LoadingState message="טוען תיק הפרויקטים..." />
      </main>
    );
  }

  if (!portfolio) {
    return (
      <main className="of-dashboard-page">
        תיק הפרויקטים לא זמין
      </main>
    );
  }

  return (

    <main className="of-dashboard-page">
      {isValidating ? <PageLoadingOverlay /> : null}

      {/* HEADER */}

      <div className="mb-10">

        <p
          className="
            text-zinc-500
            mb-2
          "
        >
          סקירה תפעולית
        </p>

        <h1 className="of-page-title">
          תיק הפרויקטים
        </h1>

      </div>

      {/* KPI GRID */}

      <div
        className="
          grid
          grid-cols-1
          md:grid-cols-2
          xl:grid-cols-5
          gap-6
        "
      >

        <PortfolioKpiCard
          title="סה״כ פרויקטים"
          value={
            portfolio.total_projects
          }
        />

        <PortfolioKpiCard
          title="פרויקטים קריטיים"
          value={
            portfolio.critical_projects
          }
          danger
        />

        <PortfolioKpiCard
          title="סה״כ פעולות"
          value={
            portfolio.total_actions
          }
        />

        <PortfolioKpiCard
          title="סה״כ הסלמות"
          value={
            portfolio.total_escalations
          }
          danger
        />

        <PortfolioKpiCard
          title="Health ממוצע"
          value={
            portfolio.average_health_score
          }
        />

      </div>

      {/* PROJECTS */}

      <div className="mt-10">

        <h2
          className="
            text-3xl
            font-bold
            mb-6
          "
        >
          דירוג פרויקטים
        </h2>

        <div className="grid gap-6">

          {portfolio.projects.map(
            project => (

              <div
                key={
                  project.project_id
                }
                className="of-card of-card-p8"
              >

                <div
                  className="
                    flex
                    justify-between
                    items-start
                    flex-wrap
                    gap-6
                  "
                >

                  <div className="flex-1">

                    <h3
                      className="
                        text-2xl
                        font-bold
                      "
                    >
                      <Link
                        href={`/projects/${project.project_id}`}
                        className="hover:underline"
                      >
                        {project.project_name}
                      </Link>
                    </h3>

                    <div
                      className="
                        flex
                        gap-3
                        mt-4
                        flex-wrap
                      "
                    >

                      <Badge>
                        פעולות:
                        {" "}
                        {
                          project.summary
                          .actions_count
                        }
                      </Badge>

                      <Badge>
                        הסלמות:
                        {" "}
                        {
                          project.summary
                          .escalations_count
                        }
                      </Badge>

                      <Badge>
                        ביקורות:
                        {" "}
                        {
                          project.summary
                          .reviews_count
                        }
                      </Badge>

                    </div>

                    {/* PREDICTION */}

                    <div
                      className="
                        mt-6
                        p-5
                        rounded-2xl
                        border
                        border-zinc-200
                        dark:border-zinc-700
                      "
                    >

                      <div
                        className="
                          flex
                          items-center
                          gap-3
                          flex-wrap
                          mb-3
                        "
                      >

                        <PredictionBadge
                          prediction={
                            project
                            .prediction
                            .prediction
                          }
                        />

                        <span
                          className="
                            text-sm
                            text-zinc-500
                          "
                        >
                          Risk Score:
                          {" "}
                          {
                            project
                            .prediction
                            .risk_score
                          }
                        </span>

                      </div>

                      <p
                        className="
                          text-zinc-700
                          dark:text-zinc-300
                          leading-7
                        "
                      >
                        {
                          project
                          .prediction
                          .message
                        }
                      </p>

                    </div>

                  </div>

                  <div
                    className="
                      text-center
                    "
                  >

                    <div
                      className={`
                        w-24
                        h-24
                        rounded-full
                        flex
                        items-center
                        justify-center
                        text-3xl
                        font-black

                        ${
                          project.health
                            .score >= 80

                            ? `
                              bg-green-100
                              text-green-700
                              dark:bg-green-900/30
                              dark:text-green-300
                            `

                            : project.health
                              .score >= 50

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
                      {
                        project.health
                        .score
                      }
                    </div>

                    <p
                      className="
                        mt-3
                        text-zinc-500
                      "
                    >
                      Health
                    </p>

                  </div>

                </div>

              </div>

            )
          )}

        </div>

      </div>

    </main>
  );
}

type PortfolioKpiCardProps = {
  title: string;
  value: number;
  danger?: boolean;
};

function PortfolioKpiCard({
  title,
  value,
 danger,
}: PortfolioKpiCardProps) {

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

          ${
            danger
              ? "text-red-500"
              : "text-zinc-500"
          }
        `}
      >
        {title}
      </p>

      <h2
        className={`
          text-5xl
          font-black

          ${
            danger
              ? "text-red-600"
              : ""
          }
        `}
      >
        {value}
      </h2>

    </div>

  );
}

function Badge({
  children,
}: {
  children: React.ReactNode;
}) {

  return (

    <span
      className="
        text-xs
        px-3
        py-1
        rounded-full
        bg-zinc-100
        dark:bg-zinc-800
      "
    >
      {children}
    </span>

  );
}

function PredictionBadge({
  prediction,
}: {
  prediction: string;
}) {

  if (prediction === "HIGH_RISK") {

    return (

      <span
        className="
          text-xs
          px-3
          py-1
          rounded-full
          bg-red-600
          text-white
        "
      >
        סיכון גבוה
      </span>

    );
  }

  if (prediction === "MEDIUM_RISK") {

    return (

      <span
        className="
          text-xs
          px-3
          py-1
          rounded-full
          bg-yellow-500
          text-white
        "
      >
        סיכון בינוני
      </span>

    );
  }

  return (

    <span
      className="
        text-xs
        px-3
        py-1
        rounded-full
        bg-green-600
        text-white
      "
    >
      סיכון נמוך
    </span>

  );
}