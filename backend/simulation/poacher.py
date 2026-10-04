import random

class Poacher:
    def __init__(self, forest, start_node: str):
        self.forest = forest
        self.current_node = start_node
        self.stay_prob = 0.5

    def move(self):
        if random.random() < self.stay_prob:
            return self.current_node
            
        neighbors = self.forest.get_neighbors(self.current_node)
        if neighbors:
            self.current_node = random.choice(neighbors)
        return self.current_node
