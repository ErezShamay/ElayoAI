"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

type Project = {
  id: string;
  project_name: string;
  supervisor_name: string;
  supervisor_email: string;
  status: string;
  created_at: string;
};

type Review = {
  id: string;
  business_impact: string;
  tenant_risk: string;
  recommended_action: string;
  review_status: string;
};

type Action = {
  id: string;
  action_type: string;
  title: string;
  description: string;
  status: string;
  assigned_to: string | null;
};

type Summary = {
  reviews_count: number;
  actions_count: number;
  escalations_count: number;
  reports_count: number;
};

export function useProjectWorkspace(
  projectId: string
) {

  const [project, setProject] =
    useState<Project | null>(null);

  const [reviews, setReviews] =
    useState<Review[]>([]);

  const [actions, setActions] =
    useState<Action[]>([]);

  const [exceptions, setExceptions] =
    useState<Action[]>([]);

  const [summary, setSummary] =
    useState<Summary>({
      reviews_count: 0,
      actions_count: 0,
      escalations_count: 0,
      reports_count: 0,
    });

  const [loading, setLoading] =
    useState(true);

  const loadWorkspace =
    useCallback(async () => {

      if (!projectId) {
        return;
      }

      try {

        setLoading(true);

        const [
          projectResponse,
          reviewsResponse,
          actionsResponse,
          exceptionsResponse,
          summaryResponse,
        ] = await Promise.all([
          fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/projects/${projectId}`
          ),

          fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/projects/${projectId}/reviews`
          ),

          fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/projects/${projectId}/actions`
          ),

          fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/projects/${projectId}/exceptions`
          ),

          fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/projects/${projectId}/summary`
          ),
        ]);

        const projectData =
          await projectResponse.json();

        const reviewsData =
          await reviewsResponse.json();

        const actionsData =
          await actionsResponse.json();

        const exceptionsData =
          await exceptionsResponse.json();

        const summaryData =
          await summaryResponse.json();

        setProject(projectData);

        setReviews(reviewsData);

        setActions(actionsData);

        setExceptions(exceptionsData);

        setSummary(summaryData);

      } catch (error) {

        console.error(error);

      } finally {

        setLoading(false);

      }

    }, [projectId]);

  useEffect(() => {
    loadWorkspace();
  }, [loadWorkspace]);

  return {
    project,
    reviews,
    actions,
    exceptions,
    summary,
    loading,
    reloadWorkspace:
      loadWorkspace,
    setReviews,
    setActions,
  };
}