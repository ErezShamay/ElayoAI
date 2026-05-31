from __future__ import annotations

import json
import re

from app.config.settings import settings


class TenantExtractionService:
    def extract_from_text(self, text: str) -> dict:
        text = (text or "").strip()
        if not text:
            return {"tenants": [], "error": "לא סופק טקסט לחילוץ"}

        if settings.get_active_openai_api_key():
            try:
                return self._extract_with_openai(text)
            except Exception as exc:
                return {
                    "tenants": [],
                    "error": f"שגיאת AI: {exc}",
                }

        return self._extract_mock(text)

    def _extract_with_openai(self, text: str) -> dict:
        from openai import OpenAI

        client = OpenAI(api_key=settings.get_active_openai_api_key())
        prompt = f"""אתה עוזר לחילוץ נתוני דיירים בבניין מגורים.
החזר JSON בלבד עם מערך "tenants". כל פריט כולל:
- apartment (מספר דירה כמחרוזת)
- name (שם בעל הדירה)
- phone (טלפון נייד, ספרות בלבד או עם +972)
- email (כתובת מייל)
- building (אופציונלי)
- entrance (אופציונלי)

אם שדה חסר השאר מחרוזת ריקה. אל תמציא נתונים.

טקסט:
{text[:120000]}
"""

        response = client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": "Return only valid JSON with a tenants array.",
                },
                {"role": "user", "content": prompt},
            ],
            response_format={"type": "json_object"},
        )

        raw = response.choices[0].message.content or "{}"
        data = json.loads(raw)
        tenants = data.get("tenants", [])
        if not isinstance(tenants, list):
            tenants = []

        normalized = []
        for row in tenants:
            if not isinstance(row, dict):
                continue
            normalized.append({
                "apartment": str(row.get("apartment") or "").strip(),
                "name": str(row.get("name") or "").strip(),
                "phone": str(row.get("phone") or "").strip(),
                "email": str(row.get("email") or "").strip(),
                "building": str(row.get("building") or "").strip(),
                "entrance": str(row.get("entrance") or "").strip(),
            })

        return {"tenants": normalized, "error": None}

    def _extract_mock(self, text: str) -> dict:
        tenants = []
        for line in text.splitlines():
            line = line.strip()
            if not line or line.startswith("---"):
                continue
            parts = re.split(r"[\t,;|]+", line)
            if len(parts) < 2:
                continue
            apartment = parts[0].strip()
            name = parts[1].strip()
            if not apartment or not name:
                continue
            phone = parts[2].strip() if len(parts) > 2 else ""
            email = parts[3].strip() if len(parts) > 3 else ""
            tenants.append({
                "apartment": apartment,
                "name": name,
                "phone": phone,
                "email": email,
                "building": "",
                "entrance": "",
            })

        if not tenants:
            return {
                "tenants": [],
                "error": "לא נמצאו דיירים (הפעל OPENAI_API_KEY לחילוץ חכם)",
            }

        return {"tenants": tenants, "error": None}
