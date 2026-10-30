
"""Part 3: POST /api/assign assignment endpoint."""

from __future__ import annotations

from typing import List

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, validator

from solvers.hungarian import AssignmentError, solve_assignment

router = APIRouter()

MAX_ASSIGNMENT_DIMENSION = 20


class AssignRequest(BaseModel):
    scores: List[List[float]]
    maximize: bool = True

    @validator("scores")
    def limit_matrix_dimensions(cls, scores: List[List[float]]) -> List[List[float]]:
        if len(scores) > MAX_ASSIGNMENT_DIMENSION:
            raise ValueError(
                f"scores cannot have more than {MAX_ASSIGNMENT_DIMENSION} rows."
            )

        if any(len(row) > MAX_ASSIGNMENT_DIMENSION for row in scores):
            raise ValueError(
                f"scores cannot have more than {MAX_ASSIGNMENT_DIMENSION} columns."
            )

        return scores


@router.post("/assign")
def post_assign(req: AssignRequest) -> dict:
    """Return the Hungarian solver's envelope and replayable steps."""
    try:
        return solve_assignment(req.scores, maximize=req.maximize)
    except AssignmentError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

