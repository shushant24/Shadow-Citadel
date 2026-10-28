"""Part 5: /api/pipeline (tour time -> craft time -> total score)."""
from typing import Any, Dict

from fastapi import APIRouter

from api._stub import not_implemented

router = APIRouter()


@router.post("/pipeline")
def post_pipeline(scenario: Dict[str, Any]) -> dict:
    # TODO(Part 5): solvers.pipeline.run_pipeline(scenario)
    raise not_implemented(5, "/api/pipeline")
