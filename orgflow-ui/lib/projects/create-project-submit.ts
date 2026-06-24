import type { ProjectCreatePayload } from "@/lib/projects/create-project-form";

export type ProjectCreateIllustration = {
  file: File;
  sourceHe?: string;
};

export type ProjectCreateSubmitData = {
  payload: ProjectCreatePayload;
  illustration?: ProjectCreateIllustration;
};
