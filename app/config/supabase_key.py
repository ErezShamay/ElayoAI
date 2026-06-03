from __future__ import annotations

import base64
import json


def supabase_key_jwt_role(key: str) -> str | None:
    """Return the JWT role claim when SUPABASE_KEY is a legacy JWT API key."""
    parts = key.strip().split(".")
    if len(parts) != 3:
        return None

    try:
        payload = parts[1] + "=" * (-len(parts[1]) % 4)
        decoded = json.loads(base64.urlsafe_b64decode(payload))
    except (ValueError, json.JSONDecodeError):
        return None

    role = decoded.get("role")
    return str(role) if role else None
