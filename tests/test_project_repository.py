from app.repositories.project_repository import (
    ProjectRepository
)


class FakeResponse:
    def __init__(self, data):
        self.data = data


class FakeProjectsTable:
    def __init__(self, storage: list[dict]):
        self._storage = storage
        self._mode = None
        self._payload = None

    def insert(self, payload: dict):
        self._mode = "insert"
        self._payload = payload
        return self

    def select(self, *_args, **_kwargs):
        self._mode = "select"
        return self

    def execute(self):
        if self._mode == "insert":
            created = dict(self._payload)
            created.setdefault("id", f"p-{len(self._storage) + 1}")
            self._storage.append(created)
            return FakeResponse([created])
        if self._mode == "select":
            return FakeResponse(list(self._storage))
        return FakeResponse([])


class FakeSupabaseClient:
    def __init__(self):
        self.projects = []

    def table(self, name: str):
        if name != "projects":
            raise AssertionError(f"Unexpected table: {name}")
        return FakeProjectsTable(self.projects)


def test_create_and_fetch_projects():
    repository = ProjectRepository()
    repository.client = FakeSupabaseClient()

    repository.create_project(
        project_name="מגדלי הצפון",
        supervisor_name="יוסי כהן"
    )

    projects = repository.get_all_projects()

    assert len(projects) > 0