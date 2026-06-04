"use client";

import { useState } from "react";

import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import LoadingState from "@/components/ui/LoadingState";
import PageLoadingOverlay from "@/components/ui/PageLoadingOverlay";
import { useAuth } from "@/contexts/AuthContext";
import { useOrgQuery } from "@/hooks/useOrgQuery";
import { apiFetch } from "@/lib/api/client";
import { showToast } from "@/lib/ui/toast";

type Review = {
  id: string;
  business_impact: string;
  tenant_risk: string;
  recommended_action: string;
  review_status: string;
  created_at: string;
  model_name: string;
};

const REVIEW_ATTENTION_HOURS = 48;

function reviewNeedsAttention(review: Review): boolean {
  const risk = (review.tenant_risk || "").toLowerCase();

  if (
    risk.includes("high") ||
    risk.includes("גבוה")
  ) {
    return true;
  }

  const createdAt = new Date(review.created_at).getTime();

  if (!Number.isFinite(createdAt)) {
    return false;
  }

  return (
    Date.now() - createdAt
    > REVIEW_ATTENTION_HOURS * 3600 * 1000
  );
}

export default function ReviewsPage() {
  const { profile } = useAuth();

  const {
    data,
    loading,
    isValidating,
    reload: loadReviews,
  } = useOrgQuery("reviews/pending", async () => {
    const response = await apiFetch("/reviews/pending");

    if (!response.ok) {
      return [] as Review[];
    }

    return (await response.json()) as Review[];
  });

  const reviews = data ?? [];

  const [processingId, setProcessingId] =
    useState<string | null>(null);

  const needsAttentionCount = reviews.filter(
    reviewNeedsAttention
  ).length;

  async function approveReview(reviewId: string) {
    setProcessingId(reviewId);

    try {
      const response = await apiFetch(
        `/reviews/${reviewId}/approve`,
        {
          method: "POST",
          body: JSON.stringify({
            reviewed_by:
              profile?.full_name ||
              profile?.email ||
              profile?.id ||
              "reviewer",
            review_notes: "Approved from reviews dashboard",
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Approve failed");
      }

      await loadReviews();
      showToast("הביקורת אושרה בהצלחה", "success");
    } catch (error) {
      console.error(error);
      showToast("שגיאה באישור הביקורת", "error");
    } finally {
      setProcessingId(null);
    }
  }

  async function rejectReview(reviewId: string) {
    setProcessingId(reviewId);

    try {
      const response = await apiFetch(
        `/reviews/${reviewId}/reject`,
        {
          method: "POST",
          body: JSON.stringify({
            reviewed_by:
              profile?.full_name ||
              profile?.email ||
              profile?.id ||
              "reviewer",
            review_notes: "Rejected from reviews dashboard",
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Reject failed");
      }

      await loadReviews();
      showToast("הביקורת נדחתה", "success");
    } catch (error) {
      console.error(error);
      showToast("שגיאה בדחיית הביקורת", "error");
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <main className="of-dashboard-page">

      {/* HEADER */}

      <div className="mb-10">

        <h1 className="of-page-title">
          ביקורות AI
        </h1>

        <p className="of-page-desc mt-4">
          ביקורות הממתינות לאישור
          במערכת התפעול
        </p>

      </div>

      {/* KPI */}

      <div
        className="
          grid
          grid-cols-1
          md:grid-cols-3
          gap-6
          mb-10
        "
      >

        <div className="of-kpi-card">

          <p
            className="
              text-zinc-500
              mb-3
            "
          >
            ביקורות ממתינות
          </p>

          <h2
            className="
              text-5xl
              font-black
            "
          >
            {reviews.length}
          </h2>

        </div>

        <div className="of-kpi-card border-orange-200 dark:border-orange-900">

          <p
            className="
              text-orange-500
              mb-3
            "
          >
            דורש טיפול
          </p>

          <h2
            className="
              text-5xl
              font-black
            "
          >
            {needsAttentionCount}
          </h2>

        </div>

        <div className="of-kpi-card">

          <p
            className="
              text-zinc-500
              mb-3
            "
          >
            מודל AI פעיל
          </p>

          <h2
            className="
              text-2xl
              font-bold
            "
          >
            Mistral AI
          </h2>

        </div>

      </div>

      {isValidating ? <PageLoadingOverlay /> : null}

      {loading && reviews.length === 0 ? (
        <LoadingState message="טוען ביקורות..." />
      ) : null}

      {/* EMPTY */}

      {!loading &&
        reviews.length === 0 && (

        <div className="of-card of-card-p10 of-card-xl">

          אין ביקורות ממתינות

        </div>

      )}

      {/* REVIEWS */}

      <div className="space-y-8">

        {reviews.map((review) => (

          <div
            key={review.id}
            className="of-card of-card-p10 of-card-xl"
          >

            {/* TOP */}

            <div
              className="
                flex
                justify-between
                items-start
                mb-8
              "
            >

              <div>

                <h2
                  className="
                    text-3xl
                    font-black
                  "
                >
                  ביקורת AI
                </h2>

                <p
                  className="
                    mt-2
                    text-zinc-500
                  "
                >
                  {new Date(
                    review.created_at
                  ).toLocaleString(
                    "he-IL"
                  )}
                </p>

              </div>

              <Badge variant="warning">
                ממתין לאישור
              </Badge>

            </div>

            {/* CONTENT */}

            <div className="space-y-8">

              <div>

                <h3
                  className="
                    text-lg
                    font-bold
                    mb-3
                  "
                >
                  השפעה עסקית
                </h3>

                <p
                  className="
                    leading-relaxed
                    text-lg
                  "
                >
                  {review.business_impact}
                </p>

              </div>

              <div>

                <h3
                  className="
                    text-lg
                    font-bold
                    mb-3
                  "
                >
                  סיכון לדיירים
                </h3>

                <p
                  className="
                    leading-relaxed
                    text-lg
                  "
                >
                  {review.tenant_risk}
                </p>

              </div>

              <div>

                <h3
                  className="
                    text-lg
                    font-bold
                    mb-3
                  "
                >
                  פעולה מומלצת
                </h3>

                <p
                  className="
                    leading-relaxed
                    text-lg
                  "
                >
                  {review.recommended_action}
                </p>

              </div>

            </div>

            {/* ACTIONS */}

            <div
              className="
                flex
                gap-4
                mt-10
              "
            >

              <Button
                variant="primary"
                size="lg"
                disabled={processingId === review.id}
                onClick={() => approveReview(review.id)}
              >
                אישור ביקורת
              </Button>

              <button
                disabled={processingId === review.id}
                onClick={() => rejectReview(review.id)}
                className="
                  border
                  border-zinc-300
                  dark:border-zinc-700
                  px-6
                  py-3
                  rounded-2xl
                  font-semibold
                  hover:bg-zinc-100
                  dark:hover:bg-zinc-800
                  transition
                  disabled:opacity-50
                "
              >
                דחייה
              </button>

            </div>

          </div>

        ))}

      </div>

    </main>
  );
}