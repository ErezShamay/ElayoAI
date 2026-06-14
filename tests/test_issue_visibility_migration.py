from __future__ import annotations

from pathlib import Path

from app.schemas.qc_migration import (
    ISSUE_VISIBILITY_MIGRATION_FILENAME,
    ISSUE_VISIBILITY_MIGRATION_VERSION,
    read_issue_visibility_migration_sql,
)


def test_issue_visibility_migration_file_exists() -> None:
    path = (
        Path(__file__).resolve().parents[1]
        / "db"
        / "migrations"
        / ISSUE_VISIBILITY_MIGRATION_FILENAME
    )
    assert path.is_file()


def test_deploy_sql_matches_issue_visibility_migration() -> None:
    root = Path(__file__).resolve().parents[1]
    db_sql = (
        root / "db" / "migrations" / ISSUE_VISIBILITY_MIGRATION_FILENAME
    ).read_text(encoding="utf-8")
    deploy_sql = (
        root / "deploy" / "sql" / ISSUE_VISIBILITY_MIGRATION_FILENAME
    ).read_text(encoding="utf-8")
    assert db_sql == deploy_sql


def test_issue_visibility_migration_adds_columns() -> None:
    migration_sql = read_issue_visibility_migration_sql()
    assert ISSUE_VISIBILITY_MIGRATION_VERSION == "2026061401"
    assert "quality_issues" in migration_sql
    assert "field_visit_report_lines" in migration_sql
    assert "visibility" in migration_sql
    assert "'DRAFT'" in migration_sql
    assert "'PUBLISHED'" in migration_sql
