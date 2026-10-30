"""Part 4: /api/route - TSP via Hungarian relaxation and subtour branching."""

from typing import Dict, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from solvers.tsp import solve_tsp
from solvers.geometry import time_matrix

router = APIRouter()

class RouteRequest(BaseModel):
matrix: Optional[List[List[float]]] = None
labels: Optional[List[str]] = None
points: Optional[Dict[str, List[float]]] = None

@router.post("/route")
def post_route(req: RouteRequest) -> dict:

```
# Check which input format the user has provided
has_matrix = req.matrix is not None
has_points = req.points is not None

if has_matrix == has_points:
    raise HTTPException(
        status_code=422,
        detail="Provide either matrix with labels or points, not both."
    )

# Case 1: User provides a distance matrix
if has_matrix:
    matrix = req.matrix
    labels = req.labels

    if labels is None:
        raise HTTPException(
            status_code=422,
            detail="Labels are required when matrix is provided."
        )

# Case 2: User provides coordinates
else:
    labels = list(req.points.keys())

    if len(labels) < 2:
        raise HTTPException(
            status_code=422,
            detail="At least two points are required."
        )

    for label, coordinates in req.points.items():
        if len(coordinates) != 2:
            raise HTTPException(
                status_code=422,
                detail=f"Point '{label}' must have exactly two coordinates."
            )

    try:
        matrix = time_matrix(req.points, labels)
    except (ValueError, TypeError, KeyError) as e:
        raise HTTPException(status_code=422, detail=str(e))

# Validate matrix dimensions
n = len(labels)

if n < 2:
    raise HTTPException(
        status_code=422,
        detail="At least two nodes are required."
    )

if len(matrix) != n or any(len(row) != n for row in matrix):
    raise HTTPException(
        status_code=422,
        detail="Distance matrix must be square and match the number of labels."
    )

if len(set(labels)) != n:
    raise HTTPException(
        status_code=422,
        detail="Labels must be unique."
    )

if any(not isinstance(v, (int, float)) or isinstance(v, bool) for row in matrix for v in row):
    raise HTTPException(
        status_code=422,
        detail="Matrix entries must be numeric."
    )

if any(v < 0 for row in matrix for v in row):
    raise HTTPException(
        status_code=422,
        detail="Matrix entries must be non-negative."
    )

# Run TSP solver
try:
    result = solve_tsp(matrix, labels)
    return result

except ValueError as e:
    raise HTTPException(status_code=422, detail=str(e))
```
