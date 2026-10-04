import networkx as nx

def create_grid_graph(width: int, height: int):
    G = nx.grid_2d_graph(width, height)
    # Convert node labels to strings "0_0", "0_1", etc.
    mapping = {node: f"{node[0]}_{node[1]}" for node in G.nodes()}
    G = nx.relabel_nodes(G, mapping)
    
    # Add attributes to nodes
    for node in G.nodes():
        parts = node.split('_')
        G.nodes[node]['x'] = int(parts[0])
        G.nodes[node]['y'] = int(parts[1])
        G.nodes[node]['traversal_time'] = 1.0 # default time

    # Add attributes to edges
    for u, v in G.edges():
        G[u][v]['distance'] = 1.0
        G[u][v]['weight'] = 1.0
        
    return G
