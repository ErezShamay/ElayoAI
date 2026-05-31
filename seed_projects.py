from app.repositories.project_repository import (
    ProjectRepository
)

repository = ProjectRepository()

projects = [
    {
        "project_name": "מגדלי הצפון",
        "developer_name": "יזמות הצפון בע״מ",
        "contractor_name": "קבלנות כהן",
        "lawyer_name": "עו״ד רונית לוי",
        "supervisor_name": "יוסי כהן",
        "supervisor_email": "yossi@example.com"
    },
    {
        "project_name": "גני השרון",
        "developer_name": "יזמות השרון",
        "contractor_name": "קבלנות לוי",
        "lawyer_name": "עו״ד דני כהן",
        "supervisor_name": "דני לוי",
        "supervisor_email": "danny@example.com"
    },
    {
        "project_name": "פארק הים",
        "developer_name": "יזמות החוף",
        "contractor_name": "קבלנות ישראלי",
        "lawyer_name": "עו״ד מיכל בר",
        "supervisor_name": "רועי ישראלי",
        "supervisor_email": "roee@example.com"
    }
]

for project in projects:
    repository.create_project(
        project_name=
        project["project_name"],

        developer_name=
        project["developer_name"],

        contractor_name=
        project["contractor_name"],

        lawyer_name=
        project["lawyer_name"],

        supervisor_name=
        project["supervisor_name"],

        supervisor_email=
        project["supervisor_email"]
    )

print("Seed completed.")