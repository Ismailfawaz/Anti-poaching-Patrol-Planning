import os

directories = [
    "backend/environment",
    "backend/belief",
    "backend/planning",
    "backend/simulation",
    "backend/data",
    "backend/api",
    "backend/tests",
    "backend/database"
]

for d in directories:
    os.makedirs(d, exist_ok=True)
    with open(os.path.join(d, "__init__.py"), "w") as f:
        pass

print("Backend directories created.")
