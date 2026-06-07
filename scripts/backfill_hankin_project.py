#!/usr/bin/env python3
"""Backfill חנקין 22 רעננה with metadata from the sample PDF report."""

from __future__ import annotations

import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from app.db.supabase_client import supabase
from app.repositories.project_repository import ProjectRepository

PROJECT_ID = "15ba0d7d-09b3-4652-8960-41c2d38e6c1b"
OWNER_ID = "f4489e97-3731-4952-88f0-49ce015ad9a0"
MIGRATION_FILE = (
    REPO_ROOT
    / "deploy"
    / "sql"
    / "2026060701_project_field_report_metadata_columns.sql"
)
REQUIRED_COLUMNS = ("scheme", "architect_name", "city", "developer_pm_name")


def _columns_ready() -> bool:
    try:
        supabase.table("projects").select(",".join(REQUIRED_COLUMNS)).limit(1).execute()
        return True
    except Exception:
        return False


def main() -> None:
    if not _columns_ready():
        print(
            "העמודות החדשות עדיין לא קיימות ב-Supabase.\n"
            "הרץ קודם את המיגרציה ב-SQL Editor:\n"
            f"  {MIGRATION_FILE}\n"
            "אחרי Run → הרץ שוב את הסקריפט הזה.",
            file=sys.stderr,
        )
        raise SystemExit(1)

    repository = ProjectRepository()
    updated = repository.update_project(
        PROJECT_ID,
        {
            "scheme": "TAMA38_DEMOLITION_REBUILD",
            "developer_pm_name": "שמש ניהול פרויקטים, רונן אטיאס",
            "architect_name": "ליאת דנקנר",
            "city": "רעננה",
            "owner_id": OWNER_ID,
        },
    )
    if not updated:
        raise SystemExit("Project not found or update failed")
    print("Backfilled project:", updated.get("project_name"))


if __name__ == "__main__":
    main()
