-- Sprint 3 / backlog 3.7–3.8, 3B.5: finding rows on a field visit report

CREATE TABLE IF NOT EXISTS field_visit_report_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL REFERENCES field_visit_reports (id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    location TEXT NULL,
    trade TEXT NULL,
    status TEXT NULL,
    description TEXT NULL,
    notes TEXT NULL,
    severity TEXT NULL,
    standard_ref TEXT NULL,
    engineering_impact TEXT NULL,
    issue_id TEXT NULL,
    catalog_version TEXT NULL,
    top_family TEXT NULL,
    category_id TEXT NULL,
    category_name_he TEXT NULL,
    photo_storage_path TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS field_visit_report_lines_report_idx
    ON field_visit_report_lines (report_id, sort_order);

CREATE INDEX IF NOT EXISTS field_visit_report_lines_org_idx
    ON field_visit_report_lines (organization_id);

COMMENT ON TABLE field_visit_report_lines IS
    'Inspection finding rows for field visit reports (module scope).';
