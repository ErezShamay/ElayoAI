import { apiFetch } from "@/lib/api/client";
import { readApiErrorMessage } from "@/lib/api/read-error-message";

export async function deleteProjectPermanently(
  projectId: string,
  confirmProjectName: string
): Promise<void> {
  const response = await apiFetch(
    `/projects/${encodeURIComponent(projectId)}`,
    {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        confirm_project_name: confirmProjectName,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(
      await readApiErrorMessage(response, "מחיקת הפרויקט נכשלה")
    );
  }
}
