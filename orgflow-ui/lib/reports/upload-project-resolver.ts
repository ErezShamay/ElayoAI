import { apiFetch } from "@/lib/api/client";
import { readApiErrorMessage } from "@/lib/api/read-error-message";

export const NEW_UPLOAD_PROJECT_OPTION = "__new_project__";

export type UploadProjectMatchStatus =
  | "EXACT_MATCH"
  | "NOT_FOUND"
  | "MULTIPLE_MATCHES";

export type UploadProjectResolutionProject = {
  id: string;
  project_name: string;
};

export type UploadProjectResolution = {
  match_status: UploadProjectMatchStatus;
  extracted_project_name: string | null;
  project: UploadProjectResolutionProject | null;
  projects: UploadProjectResolutionProject[];
};

export async function resolveUploadProjectFromFile(
  file: File
): Promise<UploadProjectResolution> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await apiFetch("/reports/upload/resolve-project", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(
      await readApiErrorMessage(response, "לא ניתן לזהות את הפרויקט מהדוח")
    );
  }

  return (await response.json()) as UploadProjectResolution;
}

export function buildCreateProjectHref(projectName: string): string {
  const params = new URLSearchParams({
    create: "1",
    project_name: projectName,
  });
  return `/projects?${params.toString()}`;
}
