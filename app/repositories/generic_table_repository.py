"""Generic table-level repository for operations that legitimately need to
act on an arbitrary/dynamic table name (bulk cascading deletion across many
tables when an organization or project is deleted, cross-cutting monitoring
queries, etc).

Per-table repositories (ProjectRepository, ProfileRepository, ...) remain
the right choice whenever the set of tables/queries is fixed and known -
this class exists specifically for the handful of services that operate
generically over a table name supplied by the caller, where creating one
bespoke repository class per table would not add real type safety (the
table name is a runtime value, not a fixed set) and would just be
indirection for its own sake.
"""
from __future__ import annotations

from postgrest.exceptions import APIError

from app.db.supabase_client import supabase
from app.repositories.postgrest_errors import (
    is_missing_column_error,
    is_missing_table_error,
)


class GenericTableRepository:
    def __init__(self, client=None):
        self.client = client or supabase

    def select_column(
        self,
        table_name: str,
        column: str,
        *,
        eq: tuple[str, object] | None = None,
    ) -> list[dict]:
        """SELECT <column> FROM <table_name> [WHERE eq[0] = eq[1]].
        Returns [] (instead of raising) if the table/column doesn't exist."""
        try:
            query = self.client.table(table_name).select(column)
            if eq is not None:
                query = query.eq(eq[0], eq[1])
            response = query.execute()
            return response.data or []
        except APIError as error:
            if is_missing_table_error(error, table_name):
                return []
            if eq is not None and is_missing_column_error(error, eq[0]):
                return []
            raise

    def delete_by_eq(self, table_name: str, column: str, value: object) -> int:
        """DELETE FROM <table_name> WHERE <column> = <value>. Returns the
        number of deleted rows, or 0 if the table/column doesn't exist."""
        try:
            response = (
                self.client.table(table_name).delete().eq(column, value).execute()
            )
            return len(response.data or [])
        except APIError as error:
            if is_missing_table_error(error, table_name):
                return 0
            if is_missing_column_error(error, column):
                return 0
            raise

    def delete_by_in(self, table_name: str, column: str, values: list) -> int:
        """DELETE FROM <table_name> WHERE <column> IN <values>. Returns the
        number of deleted rows, or 0 if the table/column doesn't exist."""
        if not values:
            return 0
        try:
            response = (
                self.client.table(table_name).delete().in_(column, values).execute()
            )
            return len(response.data or [])
        except APIError as error:
            if is_missing_table_error(error, table_name):
                return 0
            if is_missing_column_error(error, column):
                return 0
            raise
