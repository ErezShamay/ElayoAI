class AIRuntimeMonitoringService:
    def __init__(
        self,
        input_cost_per_1k_tokens: float = 0.0,
        output_cost_per_1k_tokens: float = 0.0,
    ):
        self.input_cost_per_1k_tokens = input_cost_per_1k_tokens
        self.output_cost_per_1k_tokens = output_cost_per_1k_tokens

    def calculate_cost_usd(
        self,
        prompt_tokens: int | None,
        completion_tokens: int | None,
    ) -> float:
        input_tokens = max(prompt_tokens or 0, 0)
        output_tokens = max(completion_tokens or 0, 0)
        total_cost = (
            (input_tokens / 1000) * self.input_cost_per_1k_tokens
            + (output_tokens / 1000) * self.output_cost_per_1k_tokens
        )
        return round(total_cost, 8)

    def build_runtime_summary(self, logs: list[dict]) -> dict:
        total_calls = len(logs)
        total_prompt_tokens = 0
        total_completion_tokens = 0
        total_cost_usd = 0.0
        latency_values: list[int] = []

        for log in logs:
            prompt_tokens = max(log.get("prompt_tokens") or 0, 0)
            completion_tokens = max(log.get("completion_tokens") or 0, 0)
            duration_ms = log.get("duration_ms")
            total_prompt_tokens += prompt_tokens
            total_completion_tokens += completion_tokens
            total_cost_usd += self.calculate_cost_usd(prompt_tokens, completion_tokens)
            if isinstance(duration_ms, int) and duration_ms >= 0:
                latency_values.append(duration_ms)

        total_tokens = total_prompt_tokens + total_completion_tokens
        avg_latency_ms = int(sum(latency_values) / len(latency_values)) if latency_values else 0
        p95_latency_ms = self._percentile(latency_values, 95)

        return {
            "total_calls": total_calls,
            "total_prompt_tokens": total_prompt_tokens,
            "total_completion_tokens": total_completion_tokens,
            "total_tokens": total_tokens,
            "total_estimated_cost_usd": round(total_cost_usd, 8),
            "avg_latency_ms": avg_latency_ms,
            "p95_latency_ms": p95_latency_ms,
        }

    def _percentile(self, values: list[int], percentile: int) -> int:
        if not values:
            return 0
        sorted_values = sorted(values)
        index = int((len(sorted_values) - 1) * (percentile / 100))
        return sorted_values[index]
