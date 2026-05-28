from uuid import uuid4

from datetime import (
    datetime,
    timedelta,
    timezone,
)

from app.schemas.automation_lock import (
    AutomationLock
)

from app.repositories.automation_lock_repository import (
    AutomationLockRepository
)


class AutomationLockService:

    def __init__(self):

        self.repository = (
            AutomationLockRepository()
        )
        self._owned_tokens: dict[str, str] = {}

    # ==========================================
    # ACQUIRE LOCK
    # ==========================================

    def acquire_lock(
        self,
        lock_key: str,
        ttl_minutes: int = 10,
        owner_token: str | None = None,
    ):
        token = owner_token or str(uuid4())

        existing_lock = (
            self.repository
            .get_lock(
                lock_key
            )
        )

        # ======================================
        # ACTIVE LOCK EXISTS
        # ======================================

        if existing_lock:

            is_expired = (
                self.repository
                .is_lock_expired(
                    existing_lock
                )
            )

            if not is_expired:

                print(
                    "[AUTOMATION_LOCK] "
                    f"Lock already active: "
                    f"{lock_key}"
                )

                return False

            # ==================================
            # CLEAN EXPIRED LOCK
            # ==================================

            self.repository.delete_lock(
                lock_key
            )

        # ======================================
        # CREATE NEW LOCK
        # ======================================

        now = (
            datetime.now(
                timezone.utc
            )
        )

        expires_at = (
            now
            + timedelta(
                minutes=ttl_minutes
            )
        )

        lock = AutomationLock(

            id=str(uuid4()),

            lock_key=
                lock_key,

            created_at=
                now,

            expires_at=
                expires_at,
            owner_token=
                token,
        )

        self.repository.create_lock(
            lock
        )

        print(
            "[AUTOMATION_LOCK] "
            f"Lock acquired: "
            f"{lock_key}"
        )
        self._owned_tokens[lock_key] = token

        return True

    # ==========================================
    # RELEASE LOCK
    # ==========================================

    def release_lock(
        self,
        lock_key: str,
        owner_token: str | None = None,
    ):
        token = (
            owner_token
            or self._owned_tokens.get(lock_key)
        )
        if token is None:
            return False

        deleted = self.repository.delete_lock(
            lock_key=lock_key,
            owner_token=token,
        )

        if deleted:
            self._owned_tokens.pop(lock_key, None)

        if deleted:
            print(
                "[AUTOMATION_LOCK] "
                f"Lock released: "
                f"{lock_key}"
            )

        return deleted