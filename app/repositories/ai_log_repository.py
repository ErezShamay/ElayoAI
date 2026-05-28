from app.db.supabase_client import (
    supabase
)


class AILogRepository:

    @staticmethod
    def create_log(
        log_data: dict
    ):

        supabase.table(
            "ai_logs"
        ).insert(
            log_data
        ).execute()

    @staticmethod
    def create_review_audit_log(
        interpretation_id: str,
        event_type: str,
        actor: str | None = None,
        details: dict | None = None,
    ):
        payload = {
            "provider":
                "internal",
            "model_name":
                "review-audit",
            "prompt_name":
                f"REVIEW_AUDIT:{interpretation_id}",
            "prompt":
                event_type,
            "response":
                str(details or {}),
            "success":
                True,
            "error_message":
                None,
        }

        if actor:
            payload["response"] = str({
                **(details or {}),
                "actor": actor,
            })

        AILogRepository.create_log(payload)

    @staticmethod
    def list_review_audit_logs(
        interpretation_id: str
    ):
        response = (
            supabase
            .table("ai_logs")
            .select("*")
            .eq(
                "prompt_name",
                f"REVIEW_AUDIT:{interpretation_id}"
            )
            .order(
                "created_at",
                desc=False
            )
            .execute()
        )

        return (
            response.data
            or []
        )

    @staticmethod
    def create_review_comment(
        interpretation_id: str,
        author: str,
        comment: str,
    ):
        payload = {
            "provider": "internal",
            "model_name": "review-comment",
            "prompt_name": f"REVIEW_COMMENT:{interpretation_id}",
            "prompt": author,
            "response": comment,
            "success": True,
            "error_message": None,
        }
        AILogRepository.create_log(payload)

    @staticmethod
    def list_review_comments(
        interpretation_id: str
    ):
        response = (
            supabase
            .table("ai_logs")
            .select("*")
            .eq(
                "prompt_name",
                f"REVIEW_COMMENT:{interpretation_id}"
            )
            .order(
                "created_at",
                desc=False
            )
            .execute()
        )
        return response.data or []

    @staticmethod
    def create_review_notification(
        interpretation_id: str,
        recipient_id: str,
        message: str,
        channel: str = "IN_APP",
    ):
        payload = {
            "provider": "internal",
            "model_name": "review-notification",
            "prompt_name": f"REVIEW_NOTIFICATION:{interpretation_id}",
            "prompt": recipient_id,
            "response": f"{channel}:{message}",
            "success": True,
            "error_message": None,
        }
        AILogRepository.create_log(payload)

    @staticmethod
    def list_review_notifications(
        interpretation_id: str
    ):
        response = (
            supabase
            .table("ai_logs")
            .select("*")
            .eq(
                "prompt_name",
                f"REVIEW_NOTIFICATION:{interpretation_id}"
            )
            .order(
                "created_at",
                desc=False
            )
            .execute()
        )
        return response.data or []