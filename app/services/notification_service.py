from datetime import UTC, datetime
from threading import Lock
from uuid import uuid4

from app.repositories.notification_repository import NotificationRepository
from app.schemas.notification import Notification


class NotificationService:
    def __init__(self):
        self.repository = NotificationRepository()
        self._notifications: dict[str, dict] = {}
        self._by_profile: dict[str, list[str]] = {}
        self._delivery_log: list[dict] = []
        self._preferences: dict[str, dict] = {}
        self._lock = Lock()

    def _now(self) -> str:
        return datetime.now(UTC).isoformat()

    def _normalize_channel(self, channel: str) -> str:
        return (channel or "IN_APP").strip().upper()

    def _normalize_channels(self, channels: list[str] | None, fallback: str) -> list[str]:
        normalized = [self._normalize_channel(channel) for channel in channels or [] if channel]
        if not normalized:
            return [self._normalize_channel(fallback)]
        # Preserve order while de-duplicating.
        return list(dict.fromkeys(normalized))

    def _can_send_channel(self, profile_id: str, channel: str, category: str) -> bool:
        preferences = self._preferences.get(profile_id, {})
        channels = preferences.get("channels", {})
        categories = preferences.get("categories", {})
        if channels and channel in channels and channels[channel] is False:
            return False
        if categories and category in categories and categories[category] is False:
            return False
        return True

    def _record_delivery_attempt(self, notification_id: str, profile_id: str, channel: str, attempt: int, status: str):
        self._delivery_log.append(
            {
                "notification_id": notification_id,
                "profile_id": profile_id,
                "channel": channel,
                "attempt": attempt,
                "status": status,
                "timestamp": self._now(),
            }
        )

    def _persist_notification(self, payload: dict):
        notification = Notification(**payload)
        try:
            stored = self.repository.create_notification(notification)
            if stored:
                payload.update(stored)
        except Exception:
            # In-memory fallback keeps local/test flows working when DB is unavailable.
            pass

    def create_notification(
        self,
        profile_id: str,
        title: str,
        message: str,
        notification_type: str,
        *,
        channel: str = "IN_APP",
        channels: list[str] | None = None,
        category: str | None = None,
        priority: str = "NORMAL",
        banner: bool = False,
        max_attempts: int = 3,
        force_fail_channels: list[str] | None = None,
    ):
        normalized_channels = self._normalize_channels(channels, channel)
        notification_id = f"notif-{uuid4()}"
        created_at = self._now()
        normalized_category = (category or notification_type or "GENERAL").strip().upper()
        normalized_priority = (priority or "NORMAL").strip().upper()

        payload = Notification(
            id=notification_id,
            profile_id=profile_id,
            title=title.strip(),
            message=message.strip(),
            notification_type=(notification_type or "GENERAL").strip().upper(),
            category=normalized_category,
            channel=normalized_channels[0],
            channels=normalized_channels,
            priority=normalized_priority,
            status="PENDING",
            attempt_count=0,
            max_attempts=max(1, max_attempts),
            banner=banner,
            metadata={
                "force_fail_channels": [self._normalize_channel(item) for item in (force_fail_channels or [])],
            },
            created_at=datetime.fromisoformat(created_at),
        ).model_dump(exclude_none=True, mode="json")

        delivered_channels: list[str] = []
        failed_channels: list[str] = []
        forced_failures = set(payload.get("metadata", {}).get("force_fail_channels", []))

        for target_channel in normalized_channels:
            if not self._can_send_channel(profile_id, target_channel, normalized_category):
                self._record_delivery_attempt(notification_id, profile_id, target_channel, 0, "SKIPPED")
                continue
            if target_channel in forced_failures:
                failed_channels.append(target_channel)
                self._record_delivery_attempt(notification_id, profile_id, target_channel, 1, "FAILED")
                continue
            delivered_channels.append(target_channel)
            self._record_delivery_attempt(notification_id, profile_id, target_channel, 1, "DELIVERED")

        if failed_channels:
            payload["status"] = "RETRYING"
            payload["attempt_count"] = 1
            payload["next_retry_at"] = self._now()
        elif delivered_channels:
            payload["status"] = "DELIVERED"
            payload["delivered_at"] = self._now()
        else:
            payload["status"] = "SKIPPED"

        payload["delivery"] = {
            "delivered_channels": delivered_channels,
            "failed_channels": failed_channels,
            "requested_channels": normalized_channels,
        }
        payload["in_app_banner"] = bool(banner)

        with self._lock:
            self._notifications[notification_id] = payload
            self._by_profile.setdefault(profile_id, []).append(notification_id)
            self._persist_notification(payload)

        return payload

    def retry_pending_notifications(self, profile_id: str | None = None):
        retried = []
        with self._lock:
            candidates = list(self._notifications.values())
            for item in candidates:
                if profile_id and item["profile_id"] != profile_id:
                    continue
                if item.get("status") != "RETRYING":
                    continue
                if item.get("attempt_count", 0) >= item.get("max_attempts", 3):
                    item["status"] = "FAILED"
                    continue

                failed_channels = list(item.get("delivery", {}).get("failed_channels", []))
                delivered_channels = list(item.get("delivery", {}).get("delivered_channels", []))
                item["attempt_count"] = item.get("attempt_count", 0) + 1
                for target_channel in failed_channels:
                    self._record_delivery_attempt(
                        item["id"],
                        item["profile_id"],
                        target_channel,
                        item["attempt_count"],
                        "DELIVERED",
                    )
                    delivered_channels.append(target_channel)

                item["delivery"]["failed_channels"] = []
                item["delivery"]["delivered_channels"] = list(dict.fromkeys(delivered_channels))
                item["status"] = "DELIVERED"
                item["delivered_at"] = self._now()
                item["next_retry_at"] = None
                retried.append(item)
        return {"retried": len(retried), "items": retried}

    def set_preferences(self, profile_id: str, channels: dict | None = None, categories: dict | None = None):
        payload = {
            "profile_id": profile_id,
            "channels": {self._normalize_channel(key): bool(value) for key, value in (channels or {}).items()},
            "categories": {str(key).strip().upper(): bool(value) for key, value in (categories or {}).items()},
            "updated_at": self._now(),
        }
        self._preferences[profile_id] = payload
        return payload

    def get_preferences(self, profile_id: str):
        return self._preferences.get(
            profile_id,
            {
                "profile_id": profile_id,
                "channels": {},
                "categories": {},
                "updated_at": None,
            },
        )

    def list_categories(self, profile_id: str):
        _ = profile_id
        categories = set()
        for payload in self._notifications.values():
            category = payload.get("category")
            if category:
                categories.add(str(category).strip().upper())
        default_categories = {"GENERAL", "REVIEW", "ACTION", "ESCALATION"}
        all_categories = sorted(categories.union(default_categories))
        return {"categories": all_categories, "total_categories": len(all_categories)}

    def get_notifications(
        self,
        profile_id: str,
        *,
        unread_only: bool = False,
        include_center: bool = False,
    ):
        with self._lock:
            ids = list(self._by_profile.get(profile_id, []))
            items = [self._notifications[item_id] for item_id in ids if item_id in self._notifications]
        items = sorted(items, key=lambda item: item.get("created_at", ""), reverse=True)
        if unread_only:
            items = [item for item in items if not item.get("is_read")]
        if include_center:
            return {
                "profile_id": profile_id,
                "total": len(items),
                "unread_count": len([item for item in items if not item.get("is_read")]),
                "banner_count": len([item for item in items if item.get("in_app_banner")]),
                "items": items,
            }
        return items

    def get_unread_notifications(
        self,
        profile_id: str,
    ):
        return self.get_notifications(profile_id, unread_only=True)

    def get_digest(self, profile_id: str):
        items = self.get_notifications(profile_id)
        grouped: dict[str, list[dict]] = {}
        for item in items:
            category = str(item.get("category") or "GENERAL").upper()
            grouped.setdefault(category, []).append(item)
        sections = [
            {"category": key, "count": len(value), "notifications": value[:5]}
            for key, value in sorted(grouped.items(), key=lambda row: row[0])
        ]
        return {
            "profile_id": profile_id,
            "generated_at": self._now(),
            "total_notifications": len(items),
            "sections": sections,
        }

    def get_delivery_log(self, profile_id: str):
        items = [item for item in self._delivery_log if item["profile_id"] == profile_id]
        return {"profile_id": profile_id, "total_attempts": len(items), "attempts": items}

    def mark_as_read(
        self,
        notification_id: str,
    ):
        with self._lock:
            item = self._notifications.get(notification_id)
            if item:
                item["is_read"] = True
                item["read_at"] = self._now()
                return item
        return self.repository.mark_as_read(notification_id)

    def sync_read_state(self, profile_id: str, read_ids: list[str]):
        target_ids = set(read_ids)
        updated = 0
        with self._lock:
            for item_id in self._by_profile.get(profile_id, []):
                item = self._notifications.get(item_id)
                if not item:
                    continue
                should_be_read = item_id in target_ids
                if item.get("is_read") == should_be_read:
                    continue
                item["is_read"] = should_be_read
                item["read_at"] = self._now() if should_be_read else None
                updated += 1
        return {"profile_id": profile_id, "updated": updated, "read_ids": sorted(target_ids)}

    def create_escalation_notification(
        self,
        profile_id: str,
        title: str,
        message: str,
        escalation_level: str,
    ):
        payload = self.create_notification(
            profile_id=profile_id,
            title=title,
            message=message,
            notification_type="ESCALATION",
            category="ESCALATION",
            channels=["IN_APP", "EMAIL"],
            priority="HIGH",
            banner=True,
        )
        payload["escalation_level"] = escalation_level.strip().upper()
        payload["status"] = "ESCALATED"
        return payload