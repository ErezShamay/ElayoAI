"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

import HomeNavBar from "@/components/layout/HomeNavBar";
import HomeScrollManager from "@/components/landing/HomeScrollManager";
import PublicHomePage from "@/components/landing/PublicHomePage";
import AppLoadingScreen from "@/components/ui/AppLoadingScreen";
import Badge from "@/components/ui/Badge";
import KpiCard from "@/components/ui/KpiCard";

import { apiFetch } from "@/lib/api/client";
import { useAuth } from "@/contexts/AuthContext";

function AuthenticatedHero() {
  return (
    <>
      <div
        className="
          mb-6
          inline-flex
          items-center
          gap-2
          rounded-full
          border
          border-brand/20
          bg-brand-muted/80
          px-4
          py-2
          text-sm
          font-medium
          text-brand
          backdrop-blur-sm
          dark:border-brand/30
          dark:bg-brand/10
          dark:text-brand-light
        "
      >
        <Sparkles className="h-4 w-4" />
        מערכת תפעול הנדסי מבוססת AI
      </div>

      <h1 className="of-page-title">
        Supervisor AI
      </h1>

      <p className="of-page-desc max-w-3xl">
        פלטפורמת AI לניהול תפעולי,
        פיקוח הנדסי, בקרת פרויקטים,
        ניתוח חריגות ונקודות סיכון
        בפרויקטי התחדשות עירונית ובנייה.
      </p>
    </>
  );
}

export default function HomePage() {
  const { user, loading: authLoading, organizations } = useAuth();
  const [totalReviews, setTotalReviews] = useState<number | null>(null);

  const totalProjects = organizations.reduce(
    (acc, org) => acc + (org.projects?.length ?? 0),
    0
  );

  useEffect(() => {
    if (!user) {
      setTotalReviews(null);
      return;
    }

    if (totalProjects === 0) {
      setTotalReviews(0);
      return;
    }

    let cancelled = false;

    async function loadReviewCount() {
      try {
        const response = await apiFetch(
          "/reviews/dashboard?limit=1"
        );

        if (!response.ok) {
          if (!cancelled) {
            setTotalReviews(0);
          }
          return;
        }

        const data = await response.json();

        if (!cancelled) {
          setTotalReviews(
            typeof data?.total_reviews === "number"
              ? data.total_reviews
              : 0
          );
        }
      } catch {
        if (!cancelled) {
          setTotalReviews(0);
        }
      }
    }

    void loadReviewCount();

    return () => {
      cancelled = true;
    };
  }, [user, totalProjects]);

  if (authLoading) {
    return <AppLoadingScreen />;
  }

  if (!user) {
    return (
      <>
        <HomeScrollManager />
        <PublicHomePage />
      </>
    );
  }

  return (
    <div className="of-app-bg min-h-screen">
      <HomeScrollManager />
      <HomeNavBar />

      <section className="of-container relative py-12 md:py-16">
        <div className="max-w-4xl">
          <AuthenticatedHero />
        </div>
      </section>

      <section className="of-container pb-16">
        <div
          className="
            grid
            grid-cols-1
            gap-6
            md:grid-cols-2
            xl:grid-cols-4
          "
        >
          <KpiCard
            label="ביקורות AI"
            value={totalReviews ?? "—"}
            variant="accent"
          />
          <KpiCard label="פרויקטים פעילים" value={totalProjects} />
          <KpiCard label="מנוע AI פעיל" value="Operational AI" />
          <KpiCard
            label="סטטוס מערכת"
            value={
              <span className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                </span>
                Online
              </span>
            }
          />
        </div>
      </section>

      <section className="of-container pb-24">
        <div className="mb-10">
          <h2 className="of-section-title">
            חברות ופרויקטים
          </h2>
          <p className="of-page-desc">
            גישה לפרויקטים הפעילים במערכת
          </p>
        </div>

        <div className="space-y-10">
          {organizations.map((organization) => (
            <div
              key={organization.id}
              className="of-card of-card-p10 of-card-xl"
            >
              <div className="mb-8">
                <h3 className="text-3xl font-bold">
                  {organization.organization_name}
                </h3>
                <p className="mt-2 text-zinc-500">
                  {organization.contact_email}
                </p>
              </div>

              <div
                className="
                  grid
                  grid-cols-1
                  gap-6
                  lg:grid-cols-2
                  xl:grid-cols-3
                "
              >
                {(organization.projects ?? []).map((project) => (
                  <Link
                    key={project.id}
                    href={`/projects/${project.id}`}
                    className="
                      of-card
                      of-card-interactive
                      of-card-muted
                      of-card-p8
                      block
                    "
                  >
                    <div
                      className="
                        mb-5
                        flex
                        items-start
                        justify-between
                        gap-3
                      "
                    >
                      <h4 className="text-2xl font-bold">
                        {project.project_name}
                      </h4>

                      <Badge variant="success">
                        פעיל
                      </Badge>
                    </div>

                    <p className="text-zinc-500">
                      כניסה לסביבת העבודה
                      התפעולית של הפרויקט
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
