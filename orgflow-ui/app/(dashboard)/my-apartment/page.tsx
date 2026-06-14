"use client";

import { useEffect, useState } from "react";

import ResidentPortalView from "@/components/apartments/ResidentPortalView";
import Button from "@/components/ui/Button";
import LoadingState from "@/components/ui/LoadingState";
import { fetchMyResidentPortal } from "@/lib/apartments/api";
import type { ResidentPortalPayload } from "@/lib/apartments/types";

export default function MyApartmentPage() {
  const [data, setData] = useState<ResidentPortalPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await fetchMyResidentPortal();
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
  }, []);

  if (loading) {
    return (
      <div className="of-container mx-auto max-w-5xl p-8">
        <LoadingState message="טוען את תיק הפיקוח שלך..." variant="spinner" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="of-container mx-auto max-w-5xl space-y-4 p-8">
        <h1 className="of-page-title text-2xl">האזור האישי שלי</h1>
        <p className="text-sm text-red-600">{error || "לא נמצאו נתונים"}</p>
        <Button variant="secondary" onClick={() => void load()}>
          נסה שוב
        </Button>
      </div>
    );
  }

  return (
    <ResidentPortalView
      data={data}
      title="האזור האישי שלי"
    />
  );
}
