"""Part 3: POST /api/assign assignment endpoint."""

from __future__ import annotations

from typing import List

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from solvers.hungarian import AssignmentError, solve_assignment

router = APIRouter()


class AssignRequest(BaseModel):
    scores: List[List[float]]
    maximize: bool = True


@router.post("/assign")
def post_assign(req: AssignRequest) -> dict:
    """Return the Hungarian solver's envelope and replayable steps."""
    try:
        return solve_assignment(req.scores, maximize=req.maximize)
    except AssignmentError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
