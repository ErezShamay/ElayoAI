class AutomationGovernanceService:
    def __init__(self):
        self._restricted_jobs = {
            "DELETE_PROJECT",
        }
        self._max_batch_size = 100

    def evaluate(
        self,
        job_name: str,
        payload: dict,
        actor: str = "system",
    ):
        reasons = []
        requires_manual_approval = False

        if job_name in self._restricted_jobs:
            reasons.append("JOB_RESTRICTED")
            requires_manual_approval = True

        batch_size = len(payload.get("items", []))
        if batch_size > self._max_batch_size:
            reasons.append("BATCH_TOO_LARGE")
            requires_manual_approval = True

        approved = not requires_manual_approval

        return {
            "job_name": job_name,
            "actor": actor,
            "approved": approved,
            "requires_manual_approval": requires_manual_approval,
            "reasons": reasons,
        }
