import { apiFetch } from "@/lib/api/client";

export async function uploadProjectIllustration(
  projectId: string,
  file: File,
  options?: { sourceHe?: string }
): Promise<void> {
  const formData = new FormData();
  formData.set("file", file, file.name);

  const response = await apiFetch(`/projects/${projectId}/illustration`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(
      (payload as { error?: { message?: string }; message?: string })
        .error?.message
        || (payload as { message?: string }).message
        || "העלאת תמונת ההדמיה נכשלה"
    );
  }

  const sourceHe = options?.sourceHe?.trim();
  if (!sourceHe) {
    return;
  }

  const patchResponse = await apiFetch(`/projects/${projectId}`, {
    method: "PATCH",
    body: JSON.stringify({
      illustration_source_he: sourceHe,
    }),
  });

  if (!patchResponse.ok) {
    throw new Error("שמירת מקור התמונה נכשלה");
  }
}
