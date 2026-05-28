class AutomationRetryPolicyService:
    def __init__(self):
        self._policies = {
            "default": {
                "max_attempts": 3,
                "backoff_seconds": 30,
                "multiplier": 2,
            }
        }

    def set_policy(
        self,
        job_name: str,
        max_attempts: int,
        backoff_seconds: int,
        multiplier: int = 2,
    ):
        policy = {
            "max_attempts": max_attempts,
            "backoff_seconds": backoff_seconds,
            "multiplier": multiplier,
        }
        self._policies[job_name] = policy
        return {
            "job_name": job_name,
            **policy,
        }

    def get_policy(
        self,
        job_name: str,
    ):
        policy = self._policies.get(job_name, self._policies["default"])
        return {
            "job_name": job_name,
            **policy,
        }

    def evaluate_retry(
        self,
        job_name: str,
        attempts: int,
    ):
        policy = self._policies.get(job_name, self._policies["default"])
        max_attempts = policy["max_attempts"]
        if attempts >= max_attempts:
            return {
                "should_retry": False,
                "delay_seconds": None,
                "max_attempts": max_attempts,
            }

        exponent = max(attempts - 1, 0)
        delay = policy["backoff_seconds"] * (policy["multiplier"] ** exponent)
        return {
            "should_retry": True,
            "delay_seconds": delay,
            "max_attempts": max_attempts,
        }
