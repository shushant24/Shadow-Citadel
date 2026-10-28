"""Part 4: /api/route."""
from typing import List

from fastapi import APIRouter
from pydantic import BaseModel

from api._stub import not_implemented

router = APIRouter()


class RouteRequest(BaseModel):
    matrix: List[List[float]]
    labels: List[str]


@router.post("/route")
def post_route(req: RouteRequest) -> dict:
    # TODO(Part 4): solvers.tsp.solve_tsp(req.matrix, req.labels) -> envelope(...)
    raise not_implemented(4, "/api/route")
