export function formatCatalogStandardCell(line: {
  issue_id?: string | null;
  standard_ref?: string | null;
  catalog_reference_id?: string | null;
}): string {
  if (!line.issue_id && !line.catalog_reference_id) {
    return "";
  }
  const standard = (line.standard_ref || "").trim();
  const catalogId = (line.catalog_reference_id || "").trim();
  if (standard && catalogId) {
    return `${standard} (${catalogId})`;
  }
  return standard || catalogId;
}
