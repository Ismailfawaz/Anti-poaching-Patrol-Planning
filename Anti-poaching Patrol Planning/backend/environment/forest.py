from .graph import create_grid_graph

class Forest:
    def __init__(self, width: int = 5, height: int = 5):
        self.width = width
        self.height = height
        self.graph = create_grid_graph(width, height)
        self.nodes = list(self.graph.nodes())

    def get_neighbors(self, node: str):
        if node in self.graph:
            return list(self.graph.neighbors(node))
        return []

    def get_edge_weight(self, u: str, v: str):
        if self.graph.has_edge(u, v):
            return self.graph[u][v].get('weight', 1.0)
        return float('inf')
