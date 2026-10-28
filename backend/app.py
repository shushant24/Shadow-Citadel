"""FastAPI app wiring and CORS (Part 5).

Run from the backend/ folder:  uvicorn app:app --reload --port 8000
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api import api_assign, api_craft, api_experiments, api_pipeline, api_route, api_geometry

app = FastAPI(title="Shadow Citadel Raid Optimizer")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],  # Vite dev server
    allow_methods=["*"],
    allow_headers=["*"],
)

for module in (api_geometry, api_route, api_assign, api_craft, api_pipeline, api_experiments):
    app.include_router(module.router, prefix="/api")


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"ok": "true"}
