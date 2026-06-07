-- Project metadata columns for field-report prefill (FR-4.3).
-- Safe to re-run: uses IF NOT EXISTS.

ALTER TABLE public.projects
    ADD COLUMN IF NOT EXISTS owner_id uuid,
    ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}'::text[],
    ADD COLUMN IF NOT EXISTS lifecycle_phase text,
    ADD COLUMN IF NOT EXISTS scheme text,
    ADD COLUMN IF NOT EXISTS developer_pm_name text,
    ADD COLUMN IF NOT EXISTS accompanying_lawyer text,
    ADD COLUMN IF NOT EXISTS architect_name text,
    ADD COLUMN IF NOT EXISTS site_manager_name text,
    ADD COLUMN IF NOT EXISTS city text,
    ADD COLUMN IF NOT EXISTS housing_units_count integer,
    ADD COLUMN IF NOT EXISTS project_start_date date,
    ADD COLUMN IF NOT EXISTS project_end_date date,
    ADD COLUMN IF NOT EXISTS project_grace_end_date date,
    ADD COLUMN IF NOT EXISTS structure_documentation_date date;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'projects_owner_id_fkey'
    ) THEN
        ALTER TABLE public.projects
            ADD CONSTRAINT projects_owner_id_fkey
            FOREIGN KEY (owner_id)
            REFERENCES public.profiles (id)
            ON DELETE SET NULL;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'projects_scheme_check'
    ) THEN
        ALTER TABLE public.projects
            ADD CONSTRAINT projects_scheme_check
            CHECK (
                scheme IS NULL
                OR scheme IN (
                    'TAMA38_STRENGTHENING',
                    'TAMA38_DEMOLITION_REBUILD',
                    'TAMA38_RELOCATED_BUILD'
                )
            );
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS projects_owner_id_idx
    ON public.projects (owner_id);

CREATE INDEX IF NOT EXISTS projects_scheme_idx
    ON public.projects (scheme);
