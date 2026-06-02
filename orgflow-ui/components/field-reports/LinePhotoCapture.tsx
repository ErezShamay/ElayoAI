"use client";

import { useEffect, useRef, useState } from "react";

import Button from "@/components/ui/Button";
import { apiFetch } from "@/lib/api/client";
import {
  createLinePhotoObjectUrl,
  deleteLinePhotoLocally,
  loadLinePhotoLocally,
  saveLinePhotoLocally,
} from "@/lib/field-reports/line-photo-store";
import { useOffline } from "@/providers/OfflineProvider";

type LinePhotoCaptureProps = {
  reportId: string;
  lineId: string;
  hasServerPhoto: boolean;
  photoUrl?: string | null;
  disabled?: boolean;
  onPhotoChange?: (hasPhoto: boolean) => void;
};

export default function LinePhotoCapture({
  reportId,
  lineId,
  hasServerPhoto,
  photoUrl,
  disabled = false,
  onPhotoChange,
}: LinePhotoCaptureProps) {
  const { isOnline } = useOffline();
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pendingLocal, setPendingLocal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;

    async function loadPreview() {
      setError("");

      if (hasServerPhoto && photoUrl && isOnline) {
        const response = await apiFetch(photoUrl);
        if (!response.ok) {
          return;
        }
        const blob = await response.blob();
        if (cancelled) {
          return;
        }
        objectUrl = createLinePhotoObjectUrl(blob);
        setPreviewUrl(objectUrl);
        setPendingLocal(false);
        return;
      }

      const local = await loadLinePhotoLocally(reportId, lineId);
      if (cancelled || !local) {
        if (!cancelled && !hasServerPhoto) {
          setPreviewUrl(null);
          setPendingLocal(false);
        }
        return;
      }

      objectUrl = createLinePhotoObjectUrl(local.blob);
      setPreviewUrl(objectUrl);
      setPendingLocal(local.pendingUpload);
    }

    void loadPreview();

    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [hasServerPhoto, photoUrl, isOnline, lineId, reportId]);

  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  async function handleFileSelected(file: File | null) {
    if (!file || disabled) {
      return;
    }

    setError("");
    setUploading(true);

    try {
      await saveLinePhotoLocally(reportId, lineId, file, {
        pendingUpload: !isOnline,
      });

      if (previewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
      setPreviewUrl(createLinePhotoObjectUrl(file));
      setPendingLocal(!isOnline);
      onPhotoChange?.(true);

      if (isOnline) {
        const formData = new FormData();
        formData.append("file", file, file.name || "line-photo.jpg");

        const response = await apiFetch(
          `/field-reports/visits/${reportId}/lines/${lineId}/photo`,
          {
            method: "POST",
            body: formData,
          }
        );

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(
            payload.error?.message
              || payload.message
              || "העלאת התמונה נכשלה"
          );
        }

        await saveLinePhotoLocally(reportId, lineId, file, {
          pendingUpload: false,
        });
        setPendingLocal(false);
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "שמירת התמונה נכשלה"
      );
    } finally {
      setUploading(false);
    }
  }

  async function removePhoto() {
    if (disabled) {
      return;
    }

    setError("");
    setUploading(true);

    try {
      if (isOnline && hasServerPhoto) {
        const response = await apiFetch(
          `/field-reports/visits/${reportId}/lines/${lineId}/photo`,
          { method: "DELETE" }
        );

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(
            payload.error?.message
              || payload.message
              || "מחיקת התמונה נכשלה"
          );
        }
      }

      await deleteLinePhotoLocally(reportId, lineId);

      if (previewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
      setPreviewUrl(null);
      setPendingLocal(false);
      onPhotoChange?.(false);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "מחיקת התמונה נכשלה"
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="mt-3 space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        disabled={disabled || uploading}
        onChange={(event) => {
          const file = event.target.files?.[0] ?? null;
          void handleFileSelected(file);
          event.target.value = "";
        }}
      />

      {previewUrl ? (
        <div className="space-y-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="תמונת ממצא"
            className="max-h-48 w-full rounded-lg border border-zinc-200 object-cover"
          />
          {pendingLocal ? (
            <p className="text-xs text-amber-700">
              נשמר במכשיר — יועלה לשרת כשתחזור רשת
            </p>
          ) : null}
          {!disabled ? (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                type="button"
                disabled={uploading}
                onClick={() => inputRef.current?.click()}
              >
                החלף תמונה
              </Button>
              <Button
                variant="secondary"
                type="button"
                disabled={uploading}
                onClick={() => void removePhoto()}
              >
                הסר תמונה
              </Button>
            </div>
          ) : null}
        </div>
      ) : !disabled ? (
        <Button
          variant="secondary"
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? "שומר תמונה..." : "צלם / בחר תמונה"}
        </Button>
      ) : null}

      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
