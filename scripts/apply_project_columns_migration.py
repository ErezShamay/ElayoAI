#!/usr/bin/env python3
"""Apply deploy/sql migrations to Supabase Postgres.

Requires one of:
  - DATABASE_URL
  - SUPABASE_DB_PASSWORD (with SUPABASE_URL from .env)
"""

from __future__ import annotations

import os
import sys
from pathlib import Path
from urllib.parse import urlparse

from dotenv import load_dotenv

REPO_ROOT = Path(__file__).resolve().parents[1]
MIGRATION_FILE = (
    REPO_ROOT
    / "deploy"
    / "sql"
    / "2026060701_project_field_report_metadata_columns.sql"
)

POOLER_REGIONS = (
    "eu-central-1",
    "eu-west-1",
    "eu-west-2",
    "eu-west-3",
    "us-east-1",
    "us-west-1",
    "ap-southeast-1",
    "ap-northeast-1",
    "ap-south-1",
    "ca-central-1",
)


def _project_ref(supabase_url: str) -> str:
    host = urlparse(supabase_url).hostname or ""
    return host.split(".")[0]


def _connection_candidates(
    *,
    supabase_url: str,
    password: str,
) -> list[str]:
    ref = _project_ref(supabase_url)
    user = f"postgres.{ref}"
    candidates: list[str] = []

    database_url = os.getenv("DATABASE_URL", "").strip()
    if database_url:
        candidates.append(database_url)

    for region in POOLER_REGIONS:
        host = f"aws-0-{region}.pooler.supabase.com"
        for port in (6543, 5432):
            candidates.append(
                " ".join(
                    [
                        f"host={host}",
                        f"port={port}",
                        "dbname=postgres",
                        f"user={user}",
                        f"password={password}",
                        "sslmode=require",
                    ]
                )
            )

    return candidates


def _apply_sql(conninfo: str, sql: str) -> None:
    import psycopg

    with psycopg.connect(conninfo, connect_timeout=8) as conn:
        with conn.cursor() as cursor:
            cursor.execute(sql)
        conn.commit()


def main() -> int:
    load_dotenv(REPO_ROOT / ".env")

    if not MIGRATION_FILE.is_file():
        print(f"Missing migration file: {MIGRATION_FILE}", file=sys.stderr)
        return 1

    supabase_url = os.getenv("SUPABASE_URL", "").strip()
    database_url = os.getenv("DATABASE_URL", "").strip()
    password = os.getenv("SUPABASE_DB_PASSWORD", "").strip()

    if not database_url and not password:
        print(
            "Set DATABASE_URL or SUPABASE_DB_PASSWORD in .env, then re-run.",
            file=sys.stderr,
        )
        print(
            "Supabase → Project Settings → Database → Database password",
            file=sys.stderr,
        )
        return 1

    sql = MIGRATION_FILE.read_text(encoding="utf-8")
    candidates = _connection_candidates(
        supabase_url=supabase_url,
        password=password or "unused",
    )
    if database_url:
        candidates.insert(0, database_url)

    last_error: Exception | None = None
    for conninfo in candidates:
        try:
            _apply_sql(conninfo, sql)
            print(
                "Applied migration:",
                MIGRATION_FILE.name,
            )
            return 0
        except Exception as error:
            last_error = error
            continue

    print("Failed to apply migration.", file=sys.stderr)
    if last_error is not None:
        print(last_error, file=sys.stderr)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
