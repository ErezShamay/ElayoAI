from postgrest.exceptions import APIError


def is_missing_column_error(
    error: APIError,
    column: str,
) -> bool:
    message = str(error).lower()
    code = getattr(error, "code", None)
    column_lower = column.lower()

    if column_lower not in message:
        return False

    return (
        code == "PGRST204"
        or "could not find" in message
        or "does not exist" in message
    )


def is_missing_table_error(error: APIError, table: str) -> bool:
    message = str(error).lower()
    code = getattr(error, "code", None)
    table_lower = table.lower()

    if table_lower not in message:
        return False

    return (
        code in ("PGRST205", "42P01")
        or "could not find" in message
        or "does not exist" in message
        or "schema cache" in message
    )
