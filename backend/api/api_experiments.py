"""Part 10: /api/experiments (naive vs optimized, plus the 20-map summary)."""
from fastapi import APIRouter

from api._stub import not_implemented

router = APIRouter()


@router.get("/experiments")
def get_experiments() -> dict:
    # TODO(Part 10): solvers.experiments.run_experiments()
    raise not_implemented(10, "/api/experiments")
