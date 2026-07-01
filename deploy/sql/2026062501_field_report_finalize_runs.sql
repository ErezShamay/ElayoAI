-- Finalize-run audit table for the field report finalization pipeline.
-- Tracks each attempt to close + finalize a field visit report (PDF upload,
-- email send, materialization). Safe to re-run: uses IF NOT EXISTS.

CREATE TABLE IF NOT EXISTS public.field_report_finalize_runs (
    id                 uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id    uuid          NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
    report_id          uuid          NOT NULL REFERENCES public.field_visit_reports (id) ON DELETE RESTRICT,
    actor_id           uuid          REFERENCES public.profiles (id) ON DELETE SET NULL,
    status             text          NOT NULL DEFAULT 'PENDING',
    idempotency_key    text          NOT NULL,
    client_report_uuid text,
    steps_completed    jsonb         NOT NULL DEFAULT '[]'::jsonb,
    steps_failed       jsonb         NOT NULL DEFAULT '[]'::jsonb,
    error_message      text,
    email_status       text,
    email_sent_at      timestamptz,
    materialization    jsonb,
    metadata           jsonb,
    created_at         timestamptz   NOT NULL DEFAULT now(),
    updated_at         timestamptz   NOT NULL DEFAULT now()
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'field_report_finalize_runs_status_check'
    ) THEN
        ALTER TABLE public.field_report_finalize_runs
            ADD CONSTRAINT field_report_finalize_runs_status_check
            CHECK (status IN ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'PARTIAL'));
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'field_report_finalize_runs_idempotency_key_uniq'
    ) THEN
        ALTER TABLE public.field_report_finalize_runs
            ADD CONSTRAINT field_report_finalize_runs_idempotency_key_uniq
            UNIQUE (organization_id, idempotency_key);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS field_report_finalize_runs_report_idx
    ON public.field_report_finalize_runs (report_id);

CREATE INDEX IF NOT EXISTS field_report_finalize_runs_org_idx
    ON public.field_report_finalize_runs (organization_id);

CREATE INDEX IF NOT EXISTS field_report_finalize_runs_status_idx
    ON public.field_report_finalize_runs (status, created_at);

-- RLS: authenticated users see only their org's runs
ALTER TABLE public.field_report_finalize_runs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'field_report_finalize_runs'
          AND policyname = 'field_report_finalize_runs_tenant_isolation'
    ) THEN
        CREATE POLICY field_report_finalize_runs_tenant_isolation
            ON public.field_report_finalize_runs
            FOR SELECT
            USING (organization_id = public.orgflow_jwt_organization_id());
    END IF;
END $$;
