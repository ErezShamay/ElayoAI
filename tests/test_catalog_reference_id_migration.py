from __future__ import annotations

from pathlib import Path

from app.schemas.qc_migration import (
    CATALOG_REFERENCE_ID_MIGRATION_FILENAME,
    CATALOG_REFERENCE_ID_MIGRATION_VERSION,
    read_catalog_reference_id_migration_sql,
)


def test_catalog_reference_id_migration_file_exists() -> None:
    path = (
        Path(__file__).resolve().parents[1]
        / "db"
        / "migrations"
        / CATALOG_REFERENCE_ID_MIGRATION_FILENAME
    )
    assert path.is_file()


def test_deploy_sql_matches_catalog_reference_id_migration() -> None:
    root = Path(__file__).resolve().parents[1]
    db_sql = (
        root / "db" / "migrations" / CATALOG_REFERENCE_ID_MIGRATION_FILENAME
    ).read_text(encoding="utf-8")
    deploy_sql = (
        root / "deploy" / "sql" / CATALOG_REFERENCE_ID_MIGRATION_FILENAME
    ).read_text(encoding="utf-8")
    assert db_sql == deploy_sql


def test_catalog_reference_id_migration_adds_columns() -> None:
    migration_sql = read_catalog_reference_id_migration_sql()
    assert CATALOG_REFERENCE_ID_MIGRATION_VERSION == "2026061402"
    assert "field_visit_report_lines" in migration_sql
    assert "quality_issues" in migration_sql
    assert "catalog_reference_id" in migration_sql
