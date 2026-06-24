import { apiFetch } from "@/lib/api/client";
import { readApiErrorMessage } from "@/lib/api/read-error-message";
import { sortByApartmentNumber } from "@/lib/apartments/sort";
import type { ProjectApartment, ResidentPortalPayload } from "@/lib/apartments/types";
import type { Tenant } from "@/lib/tenants/types";

async function parseApartmentsApiError(
  response: Response,
  fallback: string
): Promise<never> {
  const message = await readApiErrorMessage(response, fallback);
  throw new Error(message);
}

export async function listProjectApartments(
  projectId: string
): Promise<ProjectApartment[]> {
  const response = await apiFetch(`/projects/${projectId}/apartments`);

  if (!response.ok) {
    return parseApartmentsApiError(response, "שגיאה בטעינת רשימת הדירות");
  }

  const data = (await response.json()) as { apartments?: ProjectApartment[] };
  return sortByApartmentNumber(data.apartments ?? []);
}

export async function bulkUpsertProjectApartments(
  projectId: string,
  tenants: Tenant[]
): Promise<{ apartments: ProjectApartment[]; created: number; updated: number }> {
  const response = await apiFetch(`/projects/${projectId}/apartments/bulk`, {
    method: "POST",
    body: JSON.stringify({
      apartments: tenants.map((tenant) => ({
        apartment_number: tenant.apartment,
        owner_name: tenant.name,
        phone: tenant.phone || null,
        email: tenant.email || null,
        building: tenant.building || null,
        entrance: tenant.entrance || null,
      })),
    }),
  });

  if (!response.ok) {
    return parseApartmentsApiError(response, "שגיאה בשמירת הדיירים");
  }

  return response.json();
}

export type UpdateProjectApartmentInput = {
  apartment_number: string;
  owner_name: string;
  phone?: string | null;
  email?: string | null;
};

export async function updateProjectApartment(
  projectId: string,
  apartmentId: string,
  input: UpdateProjectApartmentInput
): Promise<ProjectApartment> {
  const response = await apiFetch(
    `/projects/${projectId}/apartments/${apartmentId}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        apartment_number: input.apartment_number.trim(),
        owner_name: input.owner_name.trim(),
        phone: input.phone?.trim() || null,
        email: input.email?.trim() || null,
      }),
    }
  );

  if (!response.ok) {
    return parseApartmentsApiError(response, "שגיאה בעדכון פרטי הדירה");
  }

  const data = (await response.json()) as { apartment?: ProjectApartment };
  if (!data.apartment) {
    throw new Error("שגיאה בעדכון פרטי הדירה");
  }
  return data.apartment;
}

export async function inviteApartmentResident(
  projectId: string,
  apartmentId: string
) {
  const response = await apiFetch(
    `/projects/${projectId}/apartments/${apartmentId}/invite`,
    {
      method: "POST",
    }
  );

  if (!response.ok) {
    return parseApartmentsApiError(response, "שגיאה בשליחת הזמנה לדייר");
  }

  return response.json();
}

export async function inviteAllApartmentResidents(projectId: string): Promise<{
  invited_count: number;
  skipped_count: number;
}> {
  const response = await apiFetch(
    `/projects/${projectId}/apartments/invite-all`,
    {
      method: "POST",
    }
  );

  if (!response.ok) {
    return parseApartmentsApiError(response, "שגיאה בשליחת הזמנות");
  }

  return response.json();
}

export async function fetchMyResidentPortal(): Promise<ResidentPortalPayload> {
  const response = await apiFetch("/resident-portal/me");

  if (!response.ok) {
    return parseApartmentsApiError(response, "שגיאה בטעינת פורטל הדייר");
  }

  return response.json();
}

export async function fetchApartmentPortal(
  projectId: string,
  apartmentId: string
): Promise<ResidentPortalPayload> {
  const response = await apiFetch(
    `/projects/${projectId}/apartments/${apartmentId}/portal`
  );

  if (!response.ok) {
    return parseApartmentsApiError(response, "שגיאה בטעינת תיק הדירה");
  }

  return response.json();
}

export async function downloadResidentPortalPdf(
  pdfUrl: string,
  filename?: string | null
): Promise<void> {
  const response = await apiFetch(pdfUrl);

  if (!response.ok) {
    throw new Error(
      await readApiErrorMessage(response, "הורדת ה-PDF נכשלה")
    );
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename?.trim() || "דוח-פיקוח.pdf";
  anchor.click();
  URL.revokeObjectURL(objectUrl);
}
