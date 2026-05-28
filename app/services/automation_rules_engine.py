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

        return {
            "workflow_type": workflow_type,
            "should_execute": True,
            "actions": ["NO_OP"],
            "flags": {},
        }
