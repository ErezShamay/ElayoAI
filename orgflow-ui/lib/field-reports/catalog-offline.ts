import {
  loadOfflinePrepBundle,
  type OfflinePrepBundle,
} from "@/lib/field-reports/offline-store";

export type CatalogPayload = {
  catalog_version?: string | null;
  families?: Array<{
    top_family: string;
    label_he?: string;
    issue_count?: number;
  }>;
  categories?: Array<{
    top_family: string;
    category_id: string;
    category_name_he: string;
  }>;
  issues?: Array<{
    issue_id: string;
    issue_name_he: string;
    standard_ref?: string | null;
    top_family: string;
    category_id: string;
    category_name_he: string;
    severity?: string | null;
    description?: string | null;
  }>;
};

export function loadOfflineCatalogForVisitType(
  organizationId: string,
  visitType: string
): CatalogPayload | null {
  const bundle = loadOfflinePrepBundle(organizationId);
  if (!bundle?.catalog) {
    return null;
  }

  const fullCatalog = bundle.catalog as CatalogPayload;
  const allowedFamilies = visitTypeAllowedFamilies(
    bundle,
    visitType
  );

  if (!allowedFamilies.length) {
    return fullCatalog;
  }

  const allowed = new Set(allowedFamilies);
  return {
    catalog_version: fullCatalog.catalog_version,
    families: (fullCatalog.families || []).filter((family) =>
      allowed.has(family.top_family)
    ),
    categories: (fullCatalog.categories || []).filter((category) =>
      allowed.has(category.top_family)
    ),
    issues: (fullCatalog.issues || []).filter((issue) =>
      allowed.has(issue.top_family)
    ),
  };
}

function visitTypeAllowedFamilies(
  bundle: OfflinePrepBundle,
  visitType: string
): string[] {
  const visitTypes = bundle.visit_types as Array<{
    code?: string;
    allowed_top_families?: string[];
  }>;

  const match = visitTypes.find((entry) => entry.code === visitType);
  return match?.allowed_top_families || [];
}
