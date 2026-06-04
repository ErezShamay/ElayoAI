"use client";

import Badge from "@/components/ui/Badge";
import LoadingState from "@/components/ui/LoadingState";
import PageLoadingOverlay from "@/components/ui/PageLoadingOverlay";
import { useOrgQuery } from "@/hooks/useOrgQuery";
import { apiFetch } from "@/lib/api/client";

type Escalation = {
  id: string;
  title: string;
  description: string;
  status: string;
  created_at: string;
};

export default function EscalationsPage() {
  const {
    data,
    loading,
    isValidating,
  } = useOrgQuery("actions/escalations", async () => {
    const response = await apiFetch("/actions/escalations");

    if (!response.ok) {
      return [] as Escalation[];
    }

    return (await response.json()) as Escalation[];
  });

  const escalations = data ?? [];

  return (
    <main className="of-dashboard-page">
      <div className="mb-10">

        <h1 className="of-page-title">
          נקודות סיכון
        </h1>

        <p className="of-page-desc mt-3">
          אירועים הדורשים טיפול מיידי
        </p>

      </div>

      {isValidating ? <PageLoadingOverlay /> : null}

      {loading && escalations.length === 0 ? (
        <LoadingState message="טוען נקודות סיכון..." />
      ) : null}

      {!loading &&
        escalations.length === 0 && (
          <div className="of-card of-card-p8">
            אין נקודות סיכון פתוחות
          </div>
        )}

      <div className="grid gap-6">

        {escalations.map(
          (escalation) => (

            <div
              key={escalation.id}
              className="
                of-card
                of-card-p8
                border-red-200
                dark:border-red-900
                shadow-sm
              "
            >

              <div
                className="
                  flex
                  items-start
                  justify-between
                  mb-6
                "
              >

                <div>

                  <h2
                    className="
                      text-2xl
                      font-semibold
                    "
                  >
                    {escalation.title}
                  </h2>

                  <p
                    className="
                      text-sm
                      text-zinc-500
                      mt-2
                    "
                  >
                    {new Date(
                      escalation.created_at
                    ).toLocaleString(
                      "he-IL"
                    )}
                  </p>

                </div>

                <Badge variant="danger">
                  דחוף
                </Badge>

              </div>

              <div>

                <h3
                  className="
                    font-semibold
                    mb-3
                  "
                >
                  תיאור האירוע
                </h3>

                <p
                  className="
                    text-zinc-700
                    dark:text-zinc-300
                    leading-relaxed
                  "
                >
                  {escalation.description}
                </p>

              </div>

            </div>

          )
        )}

      </div>

    </main>
  );
}
