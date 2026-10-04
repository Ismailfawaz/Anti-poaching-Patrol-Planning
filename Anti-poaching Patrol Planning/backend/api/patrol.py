from fastapi import APIRouter
from pydantic import BaseModel
from .state import state
from planning.route_planner import plan_patrol_route

router = APIRouter()

class StartPatrolRequest(BaseModel):
    max_distance: float
    start_location: str

@router.post("/api/patrol/start")
def start_patrol(req: StartPatrolRequest):
    state.max_distance = req.max_distance
    state.ranger_location = req.start_location
    state.patrol_active = True
    
    state.current_route = plan_patrol_route(
        state.forest, 
        state.belief_state, 
        state.ranger_location, 
        state.max_distance
    )
    
    return {"status": "started", "route": state.current_route}

@router.post("/api/patrol/move")
def move_patrol():
    if not state.patrol_active:
        return {"error": "Patrol not active"}
        
    if len(state.current_route) > 1:
        # Move to the next node in route
        state.current_route.pop(0)
        state.ranger_location = state.current_route[0]
        return {"status": "moved", "ranger_location": state.ranger_location, "remaining_route": state.current_route}
    else:
        return {"status": "reached_end", "ranger_location": state.ranger_location}

@router.post("/api/patrol/end")
def end_patrol():
    state.patrol_active = False
    state.current_route = []
    return {"status": "ended"}
