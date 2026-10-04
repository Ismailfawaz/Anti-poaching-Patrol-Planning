import os
import sys
import random
import copy
from backend.environment.forest import Forest
from backend.belief.belief_state import BeliefState
from backend.simulation.poacher import Poacher
from backend.planning.route_planner import plan_patrol_route

def simulate_patrol_strategy(strategy, num_simulations=50, max_steps=20):
    detections = 0
    total_dist = 0
    
    for seed in range(num_simulations):
        random.seed(seed)
        
        forest = Forest(5, 5)
        # For simplicity in evaluation, initialize belief uniformly
        belief_state = BeliefState(forest)
        poacher = Poacher(forest, "4_4")
        ranger_loc = "0_0"
        
        # Fixed route for baseline 2
        fixed_route = plan_patrol_route(forest, belief_state, ranger_loc, 10.0)
        last_evidence_zone = None
        
        for step in range(max_steps):
            poacher.move()
            
            # Ranger movement
            if strategy == "random":
                neighbors = forest.get_neighbors(ranger_loc)
                if neighbors:
                    ranger_loc = random.choice(neighbors)
            elif strategy == "fixed":
                if step < len(fixed_route):
                    ranger_loc = fixed_route[step]
            elif strategy == "greedy":
                if last_evidence_zone:
                    # Move towards last evidence (very simplistic pathfinding)
                    from backend.planning.pathfinding import find_shortest_paths_from
                    lengths, paths = find_shortest_paths_from(forest, ranger_loc)
                    if last_evidence_zone in paths and len(paths[last_evidence_zone]) > 1:
                        ranger_loc = paths[last_evidence_zone][1]
                else:
                    neighbors = forest.get_neighbors(ranger_loc)
                    if neighbors:
                        ranger_loc = random.choice(neighbors)
            elif strategy == "dynamic":
                # Use belief state
                route = plan_patrol_route(forest, belief_state, ranger_loc, 10.0)
                if len(route) > 1:
                    ranger_loc = route[1]
                
                # Update belief using Markov (poacher moved)
                from backend.belief.transition_model import markov_update
                markov_update(belief_state, forest)
                
                # Assume ranger observes current zone
                from backend.belief.bayesian_update import bayesian_update
                if ranger_loc == poacher.current_node:
                    bayesian_update(belief_state, ranger_loc, "human_detected", True)
                else:
                    bayesian_update(belief_state, ranger_loc, "no_activity", False)
            
            total_dist += 1 # 1 unit per step
            
            if ranger_loc == poacher.current_node:
                detections += 1
                break
                
            # Random evidence for greedy
            if strategy == "greedy" and random.random() < 0.2:
                last_evidence_zone = poacher.current_node
                
    return {
        "strategy": strategy,
        "detection_rate": detections / num_simulations,
        "avg_distance": total_dist / num_simulations
    }

if __name__ == "__main__":
    sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))
    
    print("Running Evaluation (50 simulations per strategy)...")
    strategies = ["random", "fixed", "greedy", "dynamic"]
    for s in strategies:
        try:
            res = simulate_patrol_strategy(s)
            print(f"Strategy: {s.upper():<10} | Detection Rate: {res['detection_rate'] * 100:.1f}% | Avg Distance: {res['avg_distance']:.1f}")
        except Exception as e:
            print(f"Error evaluating {s}: {e}")
