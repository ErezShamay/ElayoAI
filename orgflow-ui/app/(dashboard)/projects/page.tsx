"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import FilterBar from "@/components/ui/FilterBar";
import LoadingState from "@/components/ui/LoadingState";
import PageLoadingOverlay from "@/components/ui/PageLoadingOverlay";
import PageShell from "@/components/ui/PageShell";
import PaginationControls from "@/components/ui/Pagination";
import RetryPanel from "@/components/ui/RetryPanel";
import SortSelect from "@/components/ui/SortSelect";
import ProjectCreateForm from "@/components/projects/ProjectCreateForm";
import ProjectOverviewListCard from "@/components/projects/ProjectOverviewListCard";
import { useAuth } from "@/contexts/AuthContext";
import { useAsyncData } from "@/hooks/useAsyncData";
import { useEffectiveRole } from "@/hooks/useEffectiveRole";
import { useOrgQuery } from "@/hooks/useOrgQuery";
import { useFiltering } from "@/hooks/useFiltering";
import { usePagination } from "@/hooks/usePagination";
import { useSorting } from "@/hooks/useSorting";
import { apiFetch } from "@/lib/api/client";
import type { ProjectCreateSubmitData } from "@/lib/projects/create-project-submit";
import { uploadProjectIllustration } from "@/lib/projects/upload-project-illustration";
import {
  canViewProjectSupervisionDashboard,
  fetchProjectSupervisionSummaries,
} from "@/lib/projects/supervision-dashboard";
import type { SupervisionOverallStatus } from "@/lib/projects/supervision-dashboard-types";
import { showToast } from "@/lib/ui/toast";
import { useI18n } from "@/providers/I18nProvider";
import { useOffline } from "@/providers/OfflineProvider";

type Project = {
  id: string;
  project_name: string;
  developer_name?: string | null;
  contractor_name?: string | null;
  lawyer_name?: string | null;
  supervisor_name: string;
  supervisor_email: string;
  status: string;
  created_at: string;
};

type ProjectSortKey = "project_name" | "created_at" | "status";

export default function ProjectsPage() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isOnline } = useOffline();
  const { profile, currentOrgId } = useAuth();
  const effectiveRole = useEffectiveRole();
  const canLoadSupervisionSummaries =
    canViewProjectSupervisionDashboard(effectiveRole);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createProjectName, setCreateProjectName] = useState("");

  const [expandedProjectIds, setExpandedProjectIds] = useState<
    ReadonlySet<string>
  >(() => new Set());

  const loadProjects = useCallback(async () => {
    if (!isOnline) {
      throw new Error(t("common.offline"));
    }

    const response = await apiFetch("/projects");

    if (!response.ok) {
      throw new Error("Failed to load projects");
    }

    return (await response.json()) as Project[];
  }, [isOnline, t]);

  const {
    data: projects,
    loading,
    isValidating,
    error,
    retry,
  } = useAsyncData(loadProjects, {
    cacheKey: "projects",
    showErrorToast: true,
    errorMessage: t("common.error"),
  });

  const projectList = projects ?? [];

  const loadSupervisionSummaries = useCallback(async () => {
    return fetchProjectSupervisionSummaries();
  }, []);

  const { data: supervisionSummaries } = useOrgQuery(
    "projects/supervision-summaries",
    loadSupervisionSummaries,
    {
      enabled: canLoadSupervisionSummaries && Boolean(projects?.length),
      showErrorToast: false,
    }
  );

  const supervisionStatusByProjectId = useMemo(() => {
    const map = new Map<string, SupervisionOverallStatus>();
    for (const item of supervisionSummaries?.items ?? []) {
      map.set(item.project_id, item.overall_status);
    }
    return map;
  }, [supervisionSummaries?.items]);

  const { filteredItems, searchQuery, setSearchQuery } =
    useFiltering<Project, "project_name">(
      projectList,
      (item, field) => item[field],
      "project_name"
    );

  const { sortedItems, sortKey, direction, setSort, options } =
    useSorting<Project, ProjectSortKey>(
      filteredItems,
      [
        { key: "project_name", label: "שם פרויקט" },
        { key: "created_at", label: "תאריך" },
        { key: "status", label: "סטטוס" },
      ],
      (item, key) => {
        if (key === "created_at") {
          return new Date(item.created_at).getTime();
        }

        return item[key];
      },
      "project_name"
    );

  const pagination = usePagination(sortedItems, 6);

  useEffect(() => {
    if (searchParams.get("create") !== "1") {
      return;
    }

    const projectName = searchParams.get("project_name")?.trim() ?? "";
    setShowCreateForm(true);
    setCreateProjectName(projectName);

    router.replace("/projects");
  }, [router, searchParams]);

  async function handleCreateProject({
    payload,
    illustration,
  }: ProjectCreateSubmitData) {
    try {
      setCreating(true);

      const response = await apiFetch("/projects", {
        method: "POST",
        body: JSON.stringify({
          ...payload,
          organization_id: currentOrgId || profile?.organization_id || null,
          owner_id: profile?.id || null,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create project");
      }

      const created = (await response.json()) as { id: string };

      if (illustration) {
        try {
          await uploadProjectIllustration(
            created.id,
            illustration.file,
            { sourceHe: illustration.sourceHe }
          );
        } catch {
          showToast(
            "הפרויקט נוצר, אך העלאת תמונת ההדמיה נכשלה — ניתן לנסות שוב בהגדרות הפרויקט",
            "error"
          );
          setCreateProjectName("");
          setShowCreateForm(false);
          await retry();
          return;
        }
      }

      setCreateProjectName("");
      showToast("הפרויקט נוצר בהצלחה", "success");
      setShowCreateForm(false);
      await retry();
    } catch {
      showToast("שגיאה ביצירת הפרויקט", "error");
    } finally {
      setCreating(false);
    }
  }

  function toggleProjectExpanded(projectId: string) {
    setExpandedProjectIds((current) => {
      const next = new Set(current);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  }

  return (
    <PageShell
      title={t("projects.title")}
      description="סקירה מרוכזת של כל הפרויקטים — לחצו על «הצג מידע נוסף» לפרטים מלאים"
      actions={
        <Button
          variant="primary"
          size="lg"
          type="button"
          onClick={() => setShowCreateForm(true)}
        >
          יצירת פרויקט חדש
        </Button>
      }
    >
      {showCreateForm ? (
        <Card className="mb-8">
          <div className="mb-6 flex items-center justify-between gap-4">
            <h2 className="text-2xl font-bold">יצירת פרויקט חדש</h2>
            <Button
              variant="secondary"
              type="button"
              onClick={() => setShowCreateForm(false)}
            >
              ביטול
            </Button>
          </div>

          <ProjectCreateForm
            initialProjectName={createProjectName}
            creating={creating}
            onCancel={() => setShowCreateForm(false)}
            onSubmit={handleCreateProject}
          />
        </Card>
      ) : null}

      <div className="mb-6 grid items-end gap-4 md:grid-cols-2">
        <FilterBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder={t("common.filter")}
        />
        <SortSelect
          options={options}
          sortKey={sortKey}
          direction={direction}
          onChange={setSort}
        />
      </div>

      {isValidating ? <PageLoadingOverlay /> : null}

      {loading && projectList.length === 0 ? (
        <LoadingState message={t("common.loading")} />
      ) : null}

      {!loading && error ? (
        <RetryPanel
          message={error.message}
          onRetry={() => {
            void retry().catch(() =>
              showToast(t("common.error"), "error")
            );
          }}
        />
      ) : null}

      {!loading && !error && pagination.items.length === 0 ? (
        <EmptyState title={t("projects.empty")} />
      ) : null}

      {!loading && !error ? (
        <div className="grid gap-6">
          {pagination.items.map((project) => (
            <ProjectOverviewListCard
              key={project.id}
              project={project}
              expanded={expandedProjectIds.has(project.id)}
              onToggleExpanded={() => toggleProjectExpanded(project.id)}
              supervisionStatus={
                supervisionStatusByProjectId.get(project.id) ?? null
              }
            />
          ))}
        </div>
      ) : null}

      {!loading && !error ? (
        <PaginationControls
          page={pagination.state.page}
          totalPages={pagination.totalPages}
          pageNumbers={pagination.pageNumbers}
          hasNextPage={pagination.hasNextPage}
          hasPreviousPage={pagination.hasPreviousPage}
          onPageChange={pagination.setPage}
          onNext={pagination.goToNextPage}
          onPrevious={pagination.goToPreviousPage}
        />
      ) : null}
    </PageShell>
  );
}
