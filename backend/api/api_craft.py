"""Part 2: /api/craft (builds the LP, calls Part 1's engine, adds sensitivity)."""
from typing import Any, Dict, Literal

from fastapi import APIRouter
from pydantic import BaseModel

from api._stub import not_implemented

router = APIRouter()


class CraftRequest(BaseModel):
    time_limit: float
    recipes: Dict[str, Any]
    limits: Dict[str, Any]
    method: Literal["bigm", "twophase"] = "bigm"


@router.post("/craft")
def post_craft(req: CraftRequest) -> dict:
    # TODO(Part 2): build LP -> solvers.bigm / solvers.twophase -> solvers.sensitivity
    raise not_implemented(2, "/api/craft")
