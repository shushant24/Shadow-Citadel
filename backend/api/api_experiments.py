"""Part 10: /api/experiments (naive vs optimized, plus the 20-map summary)."""
from fastapi import APIRouter

from solvers.experiments import run_experiments

router = APIRouter()


@router.get("/experiments")
def get_experiments() -> dict:
    return run_experiments(n_maps=20, seed=0)
