"""Part 5: /api/scenario and /api/hull."""
import json
from typing import Dict, List

from fastapi import APIRouter
from pydantic import BaseModel

from paths import SCENARIO_PATH
from solvers.hull import convex_hull

router = APIRouter()


class HullRequest(BaseModel):
    points: Dict[str, List[float]]


@router.get("/scenario")
def get_scenario() -> dict:
    # Returns the scenario file from plan Section 3.5 (not wrapped in the envelope).
    return json.loads(SCENARIO_PATH.read_text())


@router.post("/hull")
def post_hull(req: HullRequest) -> dict:
    return convex_hull(req.points)
