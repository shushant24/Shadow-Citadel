"""Part 5: /api/pipeline (tour time -> craft time -> total score).

POST /api/pipeline?route=optimal            -> 70 min tour, 50 min crafting, total 562
POST /api/pipeline?route=nearest_neighbour  -> 80 min tour, 40 min crafting: status "infeasible"
The body is the scenario (docs/api-contract.md).
"""
from typing import Any, Dict, Literal

from fastapi import APIRouter, HTTPException

from solvers.pipeline import run_pipeline

router = APIRouter()


@router.post("/pipeline")
def post_pipeline(
    scenario: Dict[str, Any],
    route: Literal["optimal", "nearest_neighbour"] = "optimal",
) -> dict:
    try:
        return run_pipeline(scenario, route=route)
    except (ValueError, KeyError, TypeError) as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
