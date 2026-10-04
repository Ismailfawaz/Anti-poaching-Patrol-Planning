from .pathfinding import find_shortest_paths_from
from typing import List, Tuple

def plan_patrol_route(forest, belief_state, start_node: str, max_distance: float, alpha: float = 1.0, beta: float = 0.1) -> List[str]:
    # Greedy approach based on expected detection vs distance
    current_node = start_node
    route = [current_node]
    total_distance = 0.0
    
    # We will track visited nodes so we don't just bounce back and forth
    visited = set(route)
    
    current_belief = belief_state.get_belief()

    while total_distance < max_distance:
        neighbors = forest.get_neighbors(current_node)
        best_next_node = None
        best_score = -float('inf')
        best_edge_dist = 0.0
        
        for neighbor in neighbors:
            edge_dist = forest.get_edge_weight(current_node, neighbor)
            if total_distance + edge_dist > max_distance:
                continue
                
            # Score = alpha * ExpectedDetection - beta * Distance
            # If visited, expected detection is 0 (we already checked it)
            expected_detection = current_belief[neighbor] if neighbor not in visited else 0.0
            score = alpha * expected_detection - beta * edge_dist
            
            if score > best_score:
                best_score = score
                best_next_node = neighbor
                best_edge_dist = edge_dist
                
        if best_next_node is None:
            break
            
        route.append(best_next_node)
        visited.add(best_next_node)
        total_distance += best_edge_dist
        current_node = best_next_node
        
    return route
