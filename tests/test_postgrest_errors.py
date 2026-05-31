from postgrest.exceptions import APIError

from app.repositories.postgrest_errors import is_missing_column_error


def test_is_missing_column_error_postgrest_schema_cache():
    error = APIError({
        "message": (
            "Could not find the 'organization_id' column of 'profiles' "
            "in the schema cache"
        ),
        "code": "PGRST204",
    })

    assert is_missing_column_error(error, "organization_id")
    assert not is_missing_column_error(error, "owner_id")


def test_is_missing_column_error_postgres_column_missing():
    error = APIError({
        "message": "column profiles.organization_id does not exist",
        "code": "42703",
    })

    assert is_missing_column_error(error, "organization_id")
