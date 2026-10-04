# Dynamic Belief-State Based Anti-Poaching Patrol Planning System

This academic project demonstrates a dynamic planning system for anti-poaching patrols using classical AI techniques: Bayesian belief updating, Markov models, and graph-based pathfinding (Dijkstra/Greedy A*). It does not use any Machine Learning.

## Architecture
- **Backend**: FastAPI, NetworkX, NumPy. Maintains the Forest Grid, Belief State, and calculates Routes.
- **Frontend**: React, Vite, Leaflet. A dark-themed academic dashboard.
- **Camera Simulator**: Python Tkinter app to simulate camera trap observations.

## Setup & Running

1. **Backend**:
   ```cmd
   cd backend
   pip install -r requirements.txt
   python main.py
   ```
   (Runs on http://localhost:8000)

2. **Frontend**:
   ```cmd
   cd frontend
   npm install
   npm run dev
   ```
   (Runs on the provided Vite localhost port)

3. **Camera Simulator**:
   ```cmd
   python simulator/app.py
   ```

4. **Evaluation**:
   ```cmd
   python evaluate.py
   ```
   Compares the Belief-State Dynamic Planner with Random, Fixed, and Greedy baselines.

5. **Testing**:
   ```cmd
   cd backend
   pytest tests/
   ```

## Limitations
- The poacher is simulated using a Markov random walk.
- The environment is a grid graph, not a real GIS map.
- Observation probabilities are manually configured.
