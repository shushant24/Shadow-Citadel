"""Part 3: /api/assign."""
from typing import List

from fastapi import APIRouter
from pydantic import BaseModel

from api._stub import not_implemented

router = APIRouter()


class AssignRequest(BaseModel):
    scores: List[List[float]]
    maximize: bool = True


@router.post("/assign")
def post_assign(req: AssignRequest) -> dict:
    # TODO(Part 3): solvers.hungarian.solve_assignment(req.scores, req.maximize) -> envelope(...)
    raise not_implemented(3, "/api/assign")
