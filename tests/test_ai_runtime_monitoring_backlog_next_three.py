from app.services.ai_runtime_monitoring_service import AIRuntimeMonitoringService


def test_token_usage_tracking_rolls_up_prompt_and_completion_tokens():
    service = AIRuntimeMonitoringService()
    summary = service.build_runtime_summary(
        [
            {"prompt_tokens": 100, "completion_tokens": 40, "duration_ms": 120},
            {"prompt_tokens": 20, "completion_tokens": 10, "duration_ms": 80},
        ]
    )
    assert summary["total_prompt_tokens"] == 120
    assert summary["total_completion_tokens"] == 50
    assert summary["total_tokens"] == 170


def test_ai_cost_monitoring_calculates_total_estimated_cost():
    service = AIRuntimeMonitoringService(
        input_cost_per_1k_tokens=0.010,
        output_cost_per_1k_tokens=0.030,
    )
    summary = service.build_runtime_summary(
        [
            {"prompt_tokens": 1000, "completion_tokens": 500, "duration_ms": 100},
        ]
    )
    assert summary["total_estimated_cost_usd"] == 0.025


def test_ai_latency_monitoring_reports_average_and_p95():
    service = AIRuntimeMonitoringService()
    summary = service.build_runtime_summary(
        [
            {"prompt_tokens": 1, "completion_tokens": 1, "duration_ms": 50},
            {"prompt_tokens": 1, "completion_tokens": 1, "duration_ms": 80},
            {"prompt_tokens": 1, "completion_tokens": 1, "duration_ms": 200},
            {"prompt_tokens": 1, "completion_tokens": 1, "duration_ms": 20},
        ]
    )
    assert summary["avg_latency_ms"] == 87
    assert summary["p95_latency_ms"] == 80
