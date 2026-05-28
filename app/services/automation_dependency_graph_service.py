class AutomationDependencyGraphService:
    def build_graph(self, workflows: list[dict]) -> dict:
        nodes = {workflow["name"] for workflow in workflows}
        adjacency: dict[str, list[str]] = {name: [] for name in nodes}
        in_degree: dict[str, int] = {name: 0 for name in nodes}

        for workflow in workflows:
            source = workflow["name"]
            dependencies = workflow.get("depends_on", [])
            for dependency in dependencies:
                if dependency not in adjacency:
                    adjacency[dependency] = []
                    in_degree[dependency] = 0
                adjacency[dependency].append(source)
                in_degree[source] = in_degree.get(source, 0) + 1

        execution_order = self._topological_sort(adjacency, in_degree)
        has_cycle = len(execution_order) != len(adjacency)
        return {
            "nodes": sorted(adjacency.keys()),
            "adjacency": adjacency,
            "execution_order": execution_order,
            "has_cycle": has_cycle,
        }

    def _topological_sort(
        self,
        adjacency: dict[str, list[str]],
        in_degree: dict[str, int],
    ) -> list[str]:
        queue = [node for node, degree in in_degree.items() if degree == 0]
        ordered = []
        while queue:
            node = queue.pop(0)
            ordered.append(node)
            for neighbor in adjacency.get(node, []):
                in_degree[neighbor] -= 1
                if in_degree[neighbor] == 0:
                    queue.append(neighbor)
        return ordered
