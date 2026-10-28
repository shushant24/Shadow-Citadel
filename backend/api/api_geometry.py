"""Part 5: /api/scenario and /api/hull."""
import json
from typing import Dict, List

from fastapi import APIRouter
from pydantic import BaseModel

from api._stub import not_implemented
from envelope import envelope  # noqa: F401  (use when implementing /api/hull)
from paths import SCENARIO_PATH

router = APIRouter()


class HullRequest(BaseModel):
    points: Dict[str, List[float]]


@router.get("/scenario")
def get_scenario() -> dict:
    # Returns the scenario file from plan Section 3.5 (not wrapped in the envelope).
    return json.loads(SCENARIO_PATH.read_text())


@router.post("/hull")
def post_hull(req: HullRequest) -> dict:
    # TODO(Part 5): call solvers.hull.convex_hull(req.points) and wrap in envelope()
    raise not_implemented(5, "/api/hull")
