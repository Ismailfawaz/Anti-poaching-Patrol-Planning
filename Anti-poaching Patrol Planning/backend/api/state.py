import os
from fastapi import APIRouter
from environment.forest import Forest
from belief.belief_state import BeliefState
from simulation.poacher import Poacher

class AppState:
    def __init__(self):
        self.forest = Forest(5, 5)
        data_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'historical_incidents.csv')
        self.belief_state = BeliefState(self.forest, historical_data_path=data_path)
        self.poacher = Poacher(self.forest, "4_4")
        self.ranger_location = "0_0"
        self.current_route = []
        self.max_distance = 10.0
        self.patrol_active = False

state = AppState()

router = APIRouter()

@router.get("/api/state")
def get_state():
    return {
        "graph_nodes": state.forest.nodes,
        "belief": state.belief_state.get_belief(),
        "poacher_location": state.poacher.current_node,
        "ranger_location": state.ranger_location,
        "current_route": state.current_route,
        "patrol_active": state.patrol_active
    }
