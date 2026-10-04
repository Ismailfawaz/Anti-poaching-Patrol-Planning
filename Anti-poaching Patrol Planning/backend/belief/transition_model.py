def markov_update(belief_state, forest, stay_prob=0.5):
    current_belief = belief_state.get_belief()
    new_belief = {node: 0.0 for node in current_belief}
    
    for node, prob in current_belief.items():
        neighbors = forest.get_neighbors(node)
        
        if len(neighbors) == 0:
            new_belief[node] += prob
            continue
            
        move_prob = (1.0 - stay_prob) / len(neighbors)
        
        new_belief[node] += prob * stay_prob
        for neighbor in neighbors:
            new_belief[neighbor] += prob * move_prob
            
    belief_state.set_belief(new_belief)
