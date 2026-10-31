"""Part 3: POST /api/assign assignment endpoint."""

from __future__ import annotations

import math
from typing import List

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, field_validator

from solvers.hungarian import (
    AssignmentError,
    MAX_ASSIGNMENT_DIMENSION,
    MAX_SCORE_MAGNITUDE,
    solve_assignment,
)

router = APIRouter()


class AssignRequest(BaseModel):
    scores: List[List[float]]
    maximize: bool = True

    @field_validator("scores")
    @classmethod
    def limit_matrix_dimensions(cls, scores: List[List[float]]) -> List[List[float]]:
        if not scores:
            raise ValueError("scores must be a non-empty rectangular matrix.")

        if len(scores) > MAX_ASSIGNMENT_DIMENSION:
            raise ValueError(
                f"scores cannot have more than {MAX_ASSIGNMENT_DIMENSION} rows."
            )

        width = len(scores[0])
        if width == 0:
            raise ValueError("scores row must be non-empty.")

        if any(len(row) != width for row in scores):
            raise ValueError("scores must be rectangular: every row needs the same number of columns.")

        if width > MAX_ASSIGNMENT_DIMENSION:
            raise ValueError(
                f"scores cannot have more than {MAX_ASSIGNMENT_DIMENSION} columns."
            )

        for ri, row in enumerate(scores):
            for ci, val in enumerate(row):
                if not math.isfinite(val) or abs(val) > MAX_SCORE_MAGNITUDE:
                    raise ValueError(
                        f"scores[{ri + 1}][{ci + 1}] must be a finite number within magnitude {MAX_SCORE_MAGNITUDE}."
                    )

        return scores


@router.post("/assign")
def post_assign(req: AssignRequest) -> dict:
    """Return the Hungarian solver's envelope and replayable steps."""
    try:
        return solve_assignment(req.scores, maximize=req.maximize)
    except AssignmentError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
