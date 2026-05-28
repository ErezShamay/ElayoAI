PROMPTS = {

    "finding_enrichment": {
        "description":
            "Operational finding enrichment prompt",
        "required_context": [
            "finding_type",
            "summary",
        ],
        "active_version":
            "v1",
        "versions": {
            "v1": {
                "file":
                    "finding_enrichment",
            },
        },
    },

}