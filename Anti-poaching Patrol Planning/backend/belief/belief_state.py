import pandas as pd
import numpy as np

class BeliefState:
    def __init__(self, forest, historical_data_path: str = None):
        self.forest = forest
        self.nodes = forest.nodes
        self.belief = {node: 1.0 / len(self.nodes) for node in self.nodes}
        
        if historical_data_path:
            self._initialize_from_data(historical_data_path)

    def _initialize_from_data(self, path: str):
        try:
            df = pd.read_csv(path)
            counts = {row['zone_id']: row['incidents'] for _, row in df.iterrows()}
            total_incidents = sum(counts.values())
            
            if total_incidents > 0:
                # Assign probabilities based on incidents, small epsilon for unseen
                epsilon = 0.01
                for node in self.nodes:
                    if node in counts:
                        self.belief[node] = (counts[node] / total_incidents) + epsilon
                    else:
                        self.belief[node] = epsilon
                self.normalize()
        except Exception as e:
            print(f"Error loading historical data: {e}")

    def normalize(self):
        total = sum(self.belief.values())
        if total > 0:
            for node in self.belief:
                self.belief[node] /= total

    def get_belief(self):
        return self.belief

    def set_belief(self, new_belief):
        self.belief = new_belief
        self.normalize()
