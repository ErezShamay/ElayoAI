"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import ResidentPortalView from "@/components/apartments/ResidentPortalView";
import Button from "@/components/ui/Button";
import LoadingState from "@/components/ui/LoadingState";
import { fetchApartmentPortal } from "@/lib/apartments/api";
import type { ResidentPortalPayload } from "@/lib/apartments/types";

export default function ProjectApartmentPortalPage() {
  const params = useParams();
  const projectId = typeof params?.id === "string" ? params.id : "";
  const apartmentId =
    typeof params?.apartmentId === "string" ? params.apartmentId : "";
  const [data, setData] = useState<ResidentPortalPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!projectId || !apartmentId) return;
    setLoading(true);
    setError(null);
    try {
      const payload = await fetchApartmentPortal(projectId, apartmentId);
      setData(payload);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "שגיאה בטעינת תיק הדירה"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [projectId, apartmentId]);

  if (loading) {
    return (
      <div className="of-container mx-auto max-w-5xl p-8">
        <LoadingState message="טוען תיק דירה..." variant="spinner" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="of-container mx-auto max-w-5xl space-y-4 p-8">
        <Link
          href={`/projects/${projectId}/apartments`}
          className="text-sm text-brand hover:underline"
        >
          חזרה לרשימת הדירות
        </Link>
        <p className="text-sm text-red-600">{error || "לא נמצאו נתונים"}</p>
        <Button variant="secondary" onClick={() => void load()}>
          נסה שוב
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="of-container mx-auto max-w-5xl px-4 pt-6 md:px-0">
        <Link
          href={`/projects/${projectId}/apartments`}
          className="text-sm text-brand hover:underline"
        >
          חזרה לרשימת הדירות
        </Link>
      </div>
      <ResidentPortalView
        data={data}
        title="תצוגת מכרז — פורטל רוכש"
        pitchMode
      />
    </div>
  );
}
