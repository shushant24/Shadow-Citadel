"""Part 4: /api/route.

Request: either {"matrix": [[...]], "labels": [...]} (demo) or {"points": {"Base": [x, y], ...}}
(used by drag-to-recompute: the matrix is built server-side with solvers.geometry.time_matrix,
labels = the key order of `points`, the first key is the depot).
"""
from typing import Dict, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from api._stub import not_implemented

router = APIRouter()


class RouteRequest(BaseModel):
    matrix: Optional[List[List[float]]] = None
    labels: Optional[List[str]] = None
    points: Optional[Dict[str, List[float]]] = None


@router.post("/route")
def post_route(req: RouteRequest) -> dict:
    if req.points is None and (req.matrix is None or req.labels is None):
        raise HTTPException(status_code=422, detail="send either {matrix, labels} or {points}")
    # TODO(Part 4): if req.points: labels = list(req.points); matrix = solvers.geometry.time_matrix(req.points, labels)
    #               then solvers.tsp.solve_tsp(matrix, labels) -> envelope (answer incl. nearest_neighbour)
    raise not_implemented(4, "/api/route")
