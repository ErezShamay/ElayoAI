-- Sprint 2 / backlog 3.1: field visit reports (weekly inspection drafts)

CREATE TABLE IF NOT EXISTS field_visit_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
    created_by_profile_id UUID NOT NULL,
    visit_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    visit_date DATE NOT NULL,
    header_fields JSONB NOT NULL DEFAULT '{}'::jsonb,
    catalog_version TEXT NULL,
    organization_profile_snapshot JSONB NULL,
    closed_at TIMESTAMPTZ NULL,
    locked_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT field_visit_reports_visit_type_check CHECK (
        visit_type IN ('STRUCTURE_SITE', 'FINISHING_APARTMENTS')
    ),
    CONSTRAINT field_visit_reports_status_check CHECK (
        status IN ('IN_PROGRESS', 'CLOSED', 'PENDING_UPLOAD', 'LOCKED')
    )
);

CREATE INDEX IF NOT EXISTS field_visit_reports_org_idx
    ON field_visit_reports (organization_id);

CREATE INDEX IF NOT EXISTS field_visit_reports_project_idx
    ON field_visit_reports (project_id);

CREATE INDEX IF NOT EXISTS field_visit_reports_org_status_idx
    ON field_visit_reports (organization_id, status);

-- One open (in progress) report per project per organization
CREATE UNIQUE INDEX IF NOT EXISTS field_visit_reports_one_open_per_project_idx
    ON field_visit_reports (organization_id, project_id)
    WHERE status = 'IN_PROGRESS';

COMMENT ON TABLE field_visit_reports IS
    'Field-produced weekly visit reports (module scope; separate from core weekly_reports ingestion).';
