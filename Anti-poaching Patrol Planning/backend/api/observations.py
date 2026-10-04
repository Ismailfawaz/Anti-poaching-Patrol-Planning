from fastapi import APIRouter
from pydantic import BaseModel
from .state import state
from belief.bayesian_update import bayesian_update
from belief.transition_model import markov_update
from planning.route_planner import plan_patrol_route

router = APIRouter()

class ObservationRequest(BaseModel):
    zone_id: str
    evidence_type: str
    positive_evidence: bool
    tick_time: bool = True

@router.post("/api/observations")
def receive_observation(req: ObservationRequest):
    # 1. Bayesian Update
    bayesian_update(state.belief_state, req.zone_id, req.evidence_type, req.positive_evidence)
    
    # 2. Markov Update (if time ticked)
    if req.tick_time:
        markov_update(state.belief_state, state.forest)
        state.poacher.move()
        
    # 3. Dynamic Replan if patrol is active
    if state.patrol_active:
        state.current_route = plan_patrol_route(
            state.forest, 
            state.belief_state, 
            state.ranger_location, 
            state.max_distance
        )
        
    return {"status": "success", "new_route": state.current_route}
