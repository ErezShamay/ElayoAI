from __future__ import annotations

import logging

import resend

from app.config.settings import settings

logger = logging.getLogger(__name__)

DEFAULT_FROM_ADDRESS = "OrgFlow <onboarding@resend.dev>"


class UserInviteEmailService:
    def __init__(self) -> None:
        resend.api_key = settings.RESEND_API_KEY

    def _send_email(
        self,
        *,
        to_email: str,
        subject: str,
        body: str,
        event_name: str,
    ) -> dict:
        if not settings.RESEND_API_KEY:
            raise RuntimeError("RESEND_API_KEY is not configured")

        response = resend.Emails.send(
            {
                "from": DEFAULT_FROM_ADDRESS,
                "to": [to_email],
                "subject": subject,
                "text": body,
            }
        )

        logger.info(
            "User email sent",
            extra={
                "event": event_name,
                "to_email": to_email,
            },
        )

        return {
            "status": "SENT",
            "response": response,
        }

    def send_invite(
        self,
        *,
        to_email: str,
        full_name: str,
        invite_link: str,
    ) -> dict:
        body = (
            f"שלום {full_name},\n\n"
            "הוזמנת להצטרף ל-OrgFlow.\n"
            "לחץ על הקישור הבא כדי להגדיר סיסמה ולהיכנס למערכת:\n\n"
            f"{invite_link}\n\n"
            "אם לא ביקשת הזמנה זו, ניתן להתעלם מהודעה זו.\n\n"
            "בברכה,\n"
            "צוות OrgFlow"
        )

        return self._send_email(
            to_email=to_email,
            subject="הוזמנת להצטרף ל-OrgFlow",
            body=body,
            event_name="audit.user_invite_email",
        )

    def send_invite_reminder(
        self,
        *,
        to_email: str,
        full_name: str,
        invite_link: str,
    ) -> dict:
        body = (
            f"שלום {full_name},\n\n"
            "זוהי תזכורת להזמנה שלך ל-OrgFlow.\n"
            "לחץ על הקישור הבא כדי להגדיר סיסמה ולהיכנס למערכת:\n\n"
            f"{invite_link}\n\n"
            "אם כבר הגדרת סיסמה, ניתן להתעלם מהודעה זו.\n\n"
            "בברכה,\n"
            "צוות OrgFlow"
        )

        return self._send_email(
            to_email=to_email,
            subject="תזכורת: הזמנה ל-OrgFlow",
            body=body,
            event_name="audit.user_invite_resend_email",
        )

    def send_password_reset(
        self,
        *,
        to_email: str,
        full_name: str,
        reset_link: str,
    ) -> dict:
        body = (
            f"שלום {full_name},\n\n"
            "התקבלה בקשה לאיפוס הסיסמה שלך ב-OrgFlow.\n"
            "לחץ על הקישור הבא כדי לבחור סיסמה חדשה:\n\n"
            f"{reset_link}\n\n"
            "אם לא ביקשת איפוס סיסמה, ניתן להתעלם מהודעה זו.\n\n"
            "בברכה,\n"
            "צוות OrgFlow"
        )

        return self._send_email(
            to_email=to_email,
            subject="איפוס סיסמה ל-OrgFlow",
            body=body,
            event_name="audit.user_password_reset_email",
        )
