"""
Canonical schema metadata for OrgFlow Supabase tables.
Used by database hardening services for migrations, RLS, FK, and indexes.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class ForeignKeyDef:
    column: str
    references_table: str
    references_column: str = "id"
    on_delete: str = "RESTRICT"


@dataclass(frozen=True)
class IndexDef:
    name: str
    columns: tuple[str, ...]
    unique: bool = False


@dataclass(frozen=True)
class RlsPolicyDef:
    name: str
    command: str
    using_expression: str
    check_expression: str | None = None


@dataclass(frozen=True)
class TableSchema:
    name: str
    tenant_column: str | None = None
    soft_delete_column: str | None = "deleted_at"
    foreign_keys: tuple[ForeignKeyDef, ...] = ()
    indexes: tuple[IndexDef, ...] = ()
    rls_policies: tuple[RlsPolicyDef, ...] = ()
    audited: bool = True


SCHEMA_VERSION = "2026052901"

TABLES: dict[str, TableSchema] = {
    "organizations": TableSchema(
        name="organizations",
        tenant_column=None,
        soft_delete_column="deleted_at",
        indexes=(
            IndexDef("organizations_pkey", ("id",), unique=True),
            IndexDef("organizations_name_idx", ("name",)),
        ),
        rls_policies=(
            RlsPolicyDef(
                name="organizations_tenant_select",
                command="SELECT",
                using_expression="auth.uid() IS NOT NULL",
            ),
        ),
    ),
    "projects": TableSchema(
        name="projects",
        tenant_column="organization_id",
        foreign_keys=(
            ForeignKeyDef("organization_id", "organizations"),
        ),
        indexes=(
            IndexDef("projects_pkey", ("id",), unique=True),
            IndexDef("projects_org_idx", ("organization_id",)),
            IndexDef("projects_org_name_idx", ("organization_id", "project_name")),
        ),
        rls_policies=(
            RlsPolicyDef(
                name="projects_tenant_isolation",
                command="ALL",
                using_expression="organization_id = current_setting('app.organization_id')::uuid",
            ),
        ),
    ),
    "profiles": TableSchema(
        name="profiles",
        tenant_column="organization_id",
        foreign_keys=(
            ForeignKeyDef("organization_id", "organizations"),
        ),
        indexes=(
            IndexDef("profiles_pkey", ("id",), unique=True),
            IndexDef("profiles_org_idx", ("organization_id",)),
        ),
        rls_policies=(
            RlsPolicyDef(
                name="profiles_tenant_isolation",
                command="ALL",
                using_expression="organization_id = current_setting('app.organization_id')::uuid",
            ),
        ),
    ),
    "weekly_reports": TableSchema(
        name="weekly_reports",
        tenant_column="organization_id",
        foreign_keys=(
            ForeignKeyDef("project_id", "projects"),
            ForeignKeyDef("organization_id", "organizations"),
        ),
        indexes=(
            IndexDef("weekly_reports_pkey", ("id",), unique=True),
            IndexDef("weekly_reports_project_idx", ("project_id",)),
            IndexDef("weekly_reports_org_created_idx", ("organization_id", "created_at")),
        ),
        rls_policies=(
            RlsPolicyDef(
                name="weekly_reports_tenant_isolation",
                command="ALL",
                using_expression="organization_id = current_setting('app.organization_id')::uuid",
            ),
        ),
    ),
    "ai_interpretations": TableSchema(
        name="ai_interpretations",
        tenant_column="organization_id",
        foreign_keys=(
            ForeignKeyDef("report_id", "weekly_reports"),
            ForeignKeyDef("project_id", "projects"),
        ),
        indexes=(
            IndexDef("ai_interpretations_pkey", ("id",), unique=True),
            IndexDef("ai_interpretations_report_idx", ("report_id",)),
        ),
        rls_policies=(
            RlsPolicyDef(
                name="ai_interpretations_tenant_isolation",
                command="ALL",
                using_expression="organization_id = current_setting('app.organization_id')::uuid",
            ),
        ),
    ),
    "operational_actions": TableSchema(
        name="operational_actions",
        tenant_column="organization_id",
        foreign_keys=(
            ForeignKeyDef("project_id", "projects"),
        ),
        indexes=(
            IndexDef("operational_actions_pkey", ("id",), unique=True),
            IndexDef("operational_actions_project_status_idx", ("project_id", "status")),
        ),
        rls_policies=(
            RlsPolicyDef(
                name="operational_actions_tenant_isolation",
                command="ALL",
                using_expression="organization_id = current_setting('app.organization_id')::uuid",
            ),
        ),
    ),
    "automation_runs": TableSchema(
        name="automation_runs",
        tenant_column="organization_id",
        foreign_keys=(
            ForeignKeyDef("project_id", "projects", on_delete="SET NULL"),
        ),
        indexes=(
            IndexDef("automation_runs_pkey", ("id",), unique=True),
            IndexDef("automation_runs_status_idx", ("status", "created_at")),
        ),
        rls_policies=(
            RlsPolicyDef(
                name="automation_runs_tenant_isolation",
                command="ALL",
                using_expression="organization_id = current_setting('app.organization_id')::uuid",
            ),
        ),
    ),
    "circuit_breakers": TableSchema(
        name="circuit_breakers",
        tenant_column=None,
        soft_delete_column=None,
        indexes=(
            IndexDef("circuit_breakers_pkey", ("id",), unique=True),
            IndexDef("circuit_breakers_key_idx", ("breaker_key",), unique=True),
        ),
        rls_policies=(),
        audited=False,
    ),
    "ai_execution_logs": TableSchema(
        name="ai_execution_logs",
        tenant_column="organization_id",
        indexes=(
            IndexDef("ai_execution_logs_pkey", ("id",), unique=True),
            IndexDef("ai_execution_logs_org_created_idx", ("organization_id", "created_at")),
        ),
        rls_policies=(
            RlsPolicyDef(
                name="ai_execution_logs_tenant_isolation",
                command="SELECT",
                using_expression="organization_id = current_setting('app.organization_id')::uuid",
            ),
        ),
    ),
    "organization_field_report_modules": TableSchema(
        name="organization_field_report_modules",
        tenant_column="organization_id",
        foreign_keys=(
            ForeignKeyDef("organization_id", "organizations"),
        ),
        indexes=(
            IndexDef(
                "organization_field_report_modules_pkey",
                ("organization_id",),
                unique=True,
            ),
        ),
        rls_policies=(
            RlsPolicyDef(
                name="organization_field_report_modules_tenant_isolation",
                command="ALL",
                using_expression=(
                    "organization_id = "
                    "current_setting('app.organization_id')::uuid"
                ),
            ),
        ),
        audited=False,
    ),
    "field_visit_reports": TableSchema(
        name="field_visit_reports",
        tenant_column="organization_id",
        foreign_keys=(
            ForeignKeyDef("organization_id", "organizations"),
            ForeignKeyDef("project_id", "projects"),
        ),
        indexes=(
            IndexDef("field_visit_reports_pkey", ("id",), unique=True),
            IndexDef("field_visit_reports_org_idx", ("organization_id",)),
            IndexDef("field_visit_reports_project_idx", ("project_id",)),
            IndexDef(
                "field_visit_reports_org_status_idx",
                ("organization_id", "status"),
            ),
        ),
        rls_policies=(
            RlsPolicyDef(
                name="field_visit_reports_tenant_isolation",
                command="ALL",
                using_expression=(
                    "organization_id = "
                    "current_setting('app.organization_id')::uuid"
                ),
            ),
        ),
    ),
    "field_visit_report_lines": TableSchema(
        name="field_visit_report_lines",
        tenant_column="organization_id",
        foreign_keys=(
            ForeignKeyDef("organization_id", "organizations"),
            ForeignKeyDef("report_id", "field_visit_reports"),
        ),
        indexes=(
            IndexDef(
                "field_visit_report_lines_pkey",
                ("id",),
                unique=True,
            ),
            IndexDef(
                "field_visit_report_lines_report_idx",
                ("report_id", "sort_order"),
            ),
            IndexDef(
                "field_visit_report_lines_org_idx",
                ("organization_id",),
            ),
        ),
        rls_policies=(
            RlsPolicyDef(
                name="field_visit_report_lines_tenant_isolation",
                command="ALL",
                using_expression=(
                    "organization_id = "
                    "current_setting('app.organization_id')::uuid"
                ),
            ),
        ),
    ),
}


MIGRATION_SCRIPTS: list[dict] = [
    {
        "version": "2026052901",
        "name": "initial_hardening_baseline",
        "description": "Baseline schema registry and tenant isolation columns",
        "tables": list(TABLES.keys()),
    },
    {
        "version": "2026052902",
        "name": "add_soft_delete_columns",
        "description": "Add deleted_at to tenant-scoped tables",
        "tables": [
            name
            for name, schema in TABLES.items()
            if schema.soft_delete_column
        ],
    },
    {
        "version": "2026053101",
        "name": "profiles_tenant_isolation",
        "description": "Add organization_id to profiles and owner_profile_id to organizations",
        "tables": ["profiles", "organizations"],
    },
    {
        "version": "2026053102",
        "name": "add_project_stakeholder_columns",
        "description": "Add developer_name, contractor_name, and lawyer_name to projects",
        "tables": ["projects"],
    },
    {
        "version": "2026053103",
        "name": "backfill_project_stakeholder_defaults",
        "description": "Backfill missing project stakeholder fields with placeholder values",
        "tables": ["projects"],
    },
    {
        "version": "2026053104",
        "name": "enforce_single_client_admin",
        "description": "Demote duplicate client admins and enforce one ADMIN per organization",
        "tables": ["profiles", "organizations"],
    },
    {
        "version": "2026060101",
        "name": "organization_field_report_module",
        "description": (
            "Field report module toggle per organization "
            "+ optional report header columns on organizations"
        ),
        "tables": [
            "organization_field_report_modules",
            "organizations",
        ],
    },
    {
        "version": "2026060102",
        "name": "field_visit_reports",
        "description": "Weekly field visit reports for the production module",
        "tables": ["field_visit_reports"],
    },
    {
        "version": "2026060103",
        "name": "field_visit_report_lines",
        "description": "Finding rows on field visit reports",
        "tables": ["field_visit_report_lines"],
    },
]


def get_table_names() -> list[str]:
    return list(TABLES.keys())


def get_tenant_scoped_tables() -> list[str]:
    return [
        name
        for name, schema in TABLES.items()
        if schema.tenant_column
    ]
