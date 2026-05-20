from app.services.finding_extraction_service import (
    FindingExtractionService
)


print("\nSTARTING TEST...\n")

service = (
    FindingExtractionService()
)

report_text = """
טרם התקבל אישור כיבוי אש.
קיימת חריגה בלוחות הזמנים.
נמצא ליקוי בביצוע עבודות האיטום.
עבודות החשמל הושלמו בהצלחה.
"""

print("REPORT TEXT:")
print(report_text)

print("\nRUNNING EXTRACTION...\n")

findings = (
    service.extract_findings(
        report_text=report_text,

        report_id="test-report-id",

        project_id="test-project-id",
    )
)

print(f"TOTAL FINDINGS: {len(findings)}")

print("\n=== FINDINGS ===\n")

for finding in findings:

    print(
        finding.model_dump()
    )

    print()

print("\nTEST FINISHED\n")