"""Part 5: Distance-matrix builder (rounded Euclidean) and seeded random map generator."""

from __future__ import annotations

import math
import random
from typing import Dict, List, Tuple, Union


def time_matrix(
    nodes: Dict[str, Union[List[Union[int, float]], Tuple[Union[int, float], ...]]],
    labels: List[str],
) -> List[List[int]]:
    """Rounded Euclidean travel times; must equal data/time_matrix.json for the demo scenario."""
    if not isinstance(labels, list):
        raise ValueError("labels must be a list of node names.")
    if not isinstance(nodes, dict):
        raise ValueError("nodes must be a dictionary of name -> (x, y).")

    for label in labels:
        if label not in nodes:
            raise KeyError(f"Label '{label}' not found in nodes dictionary.")

    matrix: List[List[int]] = []
    for u in labels:
        row: List[int] = []
        p1 = nodes[u]
        x1, y1 = p1[0], p1[1]
        for v in labels:
            if u == v:
                row.append(0)
            else:
                p2 = nodes[v]
                x2, y2 = p2[0], p2[1]
                dist = round(math.hypot(x2 - x1, y2 - y1))
                row.append(int(dist))
        matrix.append(row)

    return matrix


def random_map(seed: int, n_nodes: int, max_coord: int = 25) -> Dict[str, Tuple[int, int]]:
    """Seeded map with 8 to 10 nodes for the 20-map experiment."""
    if not isinstance(n_nodes, int) or n_nodes < 1:
        raise ValueError("n_nodes must be an integer >= 1.")

    rng = random.Random(seed)
    nodes: Dict[str, Tuple[int, int]] = {"Base": (0, 0)}
    used_coords = {(0, 0)}

    for i in range(1, n_nodes):
        while True:
            pt = (rng.randint(0, max_coord), rng.randint(0, max_coord))
            if pt not in used_coords:
                used_coords.add(pt)
                nodes[f"C{i}"] = pt
                break

    return nodes
