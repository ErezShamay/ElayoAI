class AutomationRulesEngine:
    def evaluate(self, workflow_type: str, payload: dict) -> dict:
        if workflow_type == "CHECK_MISSING_REPORTS":
            missing_projects = payload.get("missing_projects", [])
            should_send_reminders = len(missing_projects) > 0
            return {
                "workflow_type": workflow_type,
                "should_execute": True,
                "actions": ["CHECK_REPORT_GAPS"],
                "flags": {
                    "send_reminders": should_send_reminders,
                },
            }

        if workflow_type == "SEND_REMINDERS":
            reminders = payload.get("reminders", [])
            return {
                "workflow_type": workflow_type,
                "should_execute": len(reminders) > 0,
                "actions": ["SEND_REMINDER_MESSAGES"],
                "flags": {
                    "dry_run": payload.get("dry_run", False),
                },
            }

        if workflow_type == "FIELD_REPORT_FINALIZED":
            report_id = str(payload.get("report_id") or "").strip()
            project_id = str(payload.get("project_id") or "").strip()
            return {
                "workflow_type": workflow_type,
                "should_execute": bool(report_id and project_id),
                "actions": ["FIELD_REPORT_FINALIZE_SIDE_EFFECTS"],
                "flags": {
                    "report_id": report_id,
                    "project_id": project_id,
                    "organization_id": payload.get("organization_id"),
                },
            }

        return {
            "workflow_type": workflow_type,
            "should_execute": True,
            "actions": ["NO_OP"],
            "flags": {},
        }
