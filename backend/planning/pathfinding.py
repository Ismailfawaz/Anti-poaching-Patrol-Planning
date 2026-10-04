import networkx as nx

def find_shortest_paths_from(forest, start_node: str):
    # Returns lengths and paths from start_node to all other nodes using Dijkstra
    lengths, paths = nx.single_source_dijkstra(forest.graph, start_node, weight='weight')
    return lengths, paths
