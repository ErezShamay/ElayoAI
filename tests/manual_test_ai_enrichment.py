from app.schemas.finding import Finding

from app.services.ai_enrichment_service import (
    AIEnrichmentService
)


finding = Finding(
    report_id="1",

    project_id="1",

    finding_type="schedule_delay",

    severity="medium",

    title="חריגה בלוחות הזמנים",

    summary="קיימת חריגה בלוחות הזמנים בפרויקט.",

    source_text="קיימת חריגה בלוחות הזמנים בפרויקט.",
)

service = (
    AIEnrichmentService()
)

result = (
    service.enrich_finding(
        finding
    )
)

print("\n=== AI ENRICHMENT ===\n")

print(result)

print()