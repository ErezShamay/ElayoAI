from datetime import datetime

from pydantic import BaseModel


class Notification(
    BaseModel
):

    id: str | None = None

    profile_id: str

    title: str

    message: str

    notification_type: str

    category: str | None = None

    channel: str = "IN_APP"

    channels: list[str] | None = None

    priority: str = "NORMAL"

    status: str = "PENDING"

    escalation_level: str | None = None

    attempt_count: int = 0

    max_attempts: int = 3

    next_retry_at: datetime | None = None

    banner: bool = False

    is_read: bool = False

    read_at: datetime | None = None

    delivered_at: datetime | None = None

    metadata: dict | None = None

    created_at: datetime | None = None
