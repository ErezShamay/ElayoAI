-- Sprint 1 / backlog 1.1 + 1.6 (partial): field report module toggle per organization
-- Apply in Supabase SQL editor or via your migration pipeline.

CREATE TABLE IF NOT EXISTS organization_field_report_modules (
    organization_id UUID PRIMARY KEY REFERENCES organizations (id) ON DELETE CASCADE,
    is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    enabled_at TIMESTAMPTZ NULL,
    disabled_at TIMESTAMPTZ NULL,
    enabled_by_profile_id UUID NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS organization_field_report_modules_enabled_idx
    ON organization_field_report_modules (is_enabled);

COMMENT ON TABLE organization_field_report_modules IS
    'Per-tenant toggle for the field report production module (supplier-managed).';

-- Optional organization columns for report header sync (backlog 0.8 P0)
ALTER TABLE organizations
    ADD COLUMN IF NOT EXISTS report_phone TEXT NULL,
    ADD COLUMN IF NOT EXISTS report_address_line TEXT NULL,
    ADD COLUMN IF NOT EXISTS report_city TEXT NULL,
    ADD COLUMN IF NOT EXISTS report_tagline TEXT NULL,
    ADD COLUMN IF NOT EXISTS logo_storage_path TEXT NULL;
