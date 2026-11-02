"""Part 5: Convex hull by hand (Graham scan) with push/pop/skip steps."""

from __future__ import annotations

import math
import numbers
from typing import Any, Dict, List, Tuple, Union

from envelope import envelope


def _cross(o: Tuple[float, float], a: Tuple[float, float], b: Tuple[float, float]) -> float:
    """2D cross product of OA and OB vectors.

    Returns:
        > 0 if O -> A -> B is a counter-clockwise (left) turn.
        < 0 if clockwise (right) turn.
        0 if collinear.
    """
    return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])


def convex_hull(points: Dict[str, Union[List[float], Tuple[float, float]]]) -> dict[str, Any]:
    """Compute the convex hull of 2D points using Graham scan.

    Args:
        points: Mapping from point name to (x, y) coordinates.

    Returns:
        Envelope containing:
            answer: {
                "vertices": list of vertex names in counter-clockwise order,
                "interior": list of non-vertex point names (sorted by name),
            }
            steps: list of step dicts with action ("push", "pop", "skip"), point, and current stack.
    """
    if not isinstance(points, dict):
        raise ValueError("points must be a dictionary of name -> (x, y).")

    parsed_pts: dict[str, tuple[float, float]] = {}
    for name, coord in points.items():
        if not isinstance(name, str):
            raise ValueError(f"Point name must be a string, got {name!r}")
        if not hasattr(coord, "__len__") or len(coord) != 2:
            raise ValueError(f"Point '{name}' must have 2 coordinates, got {coord!r}")
        x, y = coord[0], coord[1]
        if not isinstance(x, numbers.Real) or isinstance(x, bool) or not math.isfinite(x):
            raise ValueError(f"Point '{name}' x-coordinate must be a finite number, got {x!r}")
        if not isinstance(y, numbers.Real) or isinstance(y, bool) or not math.isfinite(y):
            raise ValueError(f"Point '{name}' y-coordinate must be a finite number, got {y!r}")
        parsed_pts[name] = (float(x), float(y))

    n = len(parsed_pts)
    if n == 0:
        return envelope("optimal", answer={"vertices": [], "interior": []}, steps=[])
    if n <= 2:
        return envelope("optimal", answer={"vertices": list(parsed_pts.keys()), "interior": []}, steps=[])

    # 1. Pick pivot: lowest y, break ties by lowest x
    pivot_name = min(parsed_pts.keys(), key=lambda k: (parsed_pts[k][1], parsed_pts[k][0], k))
    pivot_pt = parsed_pts[pivot_name]

    # 2. Sort remaining points by polar angle relative to pivot, then distance
    def polar_sort_key(name: str) -> tuple[float, float, str]:
        pt = parsed_pts[name]
        angle = math.atan2(pt[1] - pivot_pt[1], pt[0] - pivot_pt[0])
        dist_sq = (pt[0] - pivot_pt[0]) ** 2 + (pt[1] - pivot_pt[1]) ** 2
        return (angle, dist_sq, name)

    other_names = [k for k in parsed_pts if k != pivot_name]
    sorted_names = sorted(other_names, key=polar_sort_key)

    stack: list[str] = [pivot_name]
    steps: list[dict[str, Any]] = []

    for pt_name in sorted_names:
        pt = parsed_pts[pt_name]
        while len(stack) > 1 and _cross(parsed_pts[stack[-2]], parsed_pts[stack[-1]], pt) <= 0:
            popped = stack.pop()
            steps.append({"action": "pop", "point": popped, "stack": list(stack)})
        stack.append(pt_name)
        steps.append({"action": "push", "point": pt_name, "stack": list(stack)})

    # Final closure check: ensure the closing edge back to pivot makes a strictly left turn
    while len(stack) > 2 and _cross(parsed_pts[stack[-2]], parsed_pts[stack[-1]], parsed_pts[stack[0]]) <= 0:
        popped = stack.pop()
        steps.append({"action": "pop", "point": popped, "stack": list(stack)})

    interior = sorted([k for k in parsed_pts if k not in stack])

    return envelope(
        status="optimal",
        answer={"vertices": stack, "interior": interior},
        steps=steps,
    )
