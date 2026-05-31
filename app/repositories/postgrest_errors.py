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
