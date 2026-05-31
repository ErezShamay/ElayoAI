from __future__ import annotations

ROLE_LABELS_HE: dict[str, str] = {
    "PLATFORM_ADMIN": "מנהל גלובלי",
    "ADMIN": "מנהל לקוח",
    "MANAGER": "מנהל",
    "ANALYST": "אנליסט",
    "VIEWER": "צופה",
}

ROLE_DESCRIPTIONS_HE: dict[str, str] = {
    "PLATFORM_ADMIN": (
        "גישה לכל הלקוחות, יצירת לקוחות חדשים "
        "וניהול משתמשים בכל ארגון"
    ),
    "ADMIN": (
        "גישה רק ללקוח אחד, ניהול משתמשים "
        "והרשאות בתוך הארגון שלו בלבד"
    ),
}


def get_role_label(role: str | None) -> str:
    normalized = (role or "").strip().upper()
    return ROLE_LABELS_HE.get(normalized, normalized or "—")
