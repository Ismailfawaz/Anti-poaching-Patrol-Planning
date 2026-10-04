from typing import Dict

def bayesian_update(belief_state, observation_zone: str, evidence_type: str, positive_evidence: bool):
    # evidence_type: "human_detected", "no_activity", etc.
    # We use simple hardcoded likelihoods or from a model
    
    current_belief = belief_state.get_belief()
    new_belief = {}
    
    # Likelihoods: P(Evidence | Poacher in zone)
    if positive_evidence:
        # e.g., human_detected
        prob_given_present = 0.9
        prob_given_absent = 0.1
    else:
        # e.g., no_activity
        prob_given_present = 0.1
        prob_given_absent = 0.9

    for node, prob in current_belief.items():
        if node == observation_zone:
            likelihood = prob_given_present
        else:
            likelihood = prob_given_absent
        
        new_belief[node] = prob * likelihood
        
    belief_state.set_belief(new_belief)
