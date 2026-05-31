import { apiFetch } from "@/lib/api/client";

import type { Tenant } from "./types";

export type ExtractTenantsResult = {
  tenants: Tenant[];
  error: string | null;
};

export async function extractTenantsFromText(
  text: string,
): Promise<ExtractTenantsResult> {
  const response = await apiFetch("/tenants/extract", {
    method: "POST",
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    const detail = await response.text();
    return {
      tenants: [],
      error: detail || `שגיאת שרת (${response.status})`,
    };
  }

  const data = (await response.json()) as ExtractTenantsResult;
  return {
    tenants: data.tenants ?? [],
    error: data.error ?? null,
  };
}
