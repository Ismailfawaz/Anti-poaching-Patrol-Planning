from fastapi import FastAPI
import uvicorn

from api.observations import router as obs_router
from api.patrol import router as patrol_router
from api.state import router as state_router

app = FastAPI(title="Dynamic Belief-State Based Anti-Poaching Patrol Planning System")

app.include_router(obs_router)
app.include_router(patrol_router)
app.include_router(state_router)

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
