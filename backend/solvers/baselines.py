"""Part 10: Naive baselines: nearest neighbour, greedy assignment, equal-split crafting."""

from __future__ import annotations

import math
import numbers
from typing import Any, Dict, List, NamedTuple, Optional, Union


class TourResult(NamedTuple):
    """Result of nearest neighbour tour."""
    tour: List[str]
    cost: Union[int, float]

    def to_dict(self) -> Dict[str, Any]:
        return {"tour": self.tour, "cost": self.cost}


class AssignmentResult(NamedTuple):
    """Result of greedy assignment."""
    pairs: List[List[int]]
    total: Union[int, float]

    def to_dict(self) -> Dict[str, Any]:
        return {"pairs": self.pairs, "total": self.total}


class CraftingPlan(NamedTuple):
    """Result of equal-split crafting."""
    x: List[int]
    score: Union[int, float]

    def to_dict(self) -> Dict[str, Any]:
        return {"x": self.x, "score": self.score}


def nearest_neighbour(
    matrix: List[List[Union[int, float]]],
    labels: List[str],
    start: Union[str, int] = "Base",
) -> TourResult:
    """Return (tour_labels_including_return, cost). Expected: 80 on the demo matrix."""
    n = len(matrix)
    if len(labels) != n:
        raise ValueError(
            f"Dimension mismatch: len(labels)={len(labels)} does not match len(matrix)={n}."
        )

    for ri, row in enumerate(matrix):
        if len(row) != n:
            raise ValueError(
                f"Matrix must be square: row {ri} has length {len(row)}, expected {n}."
            )

    if n == 0:
        return TourResult([], 0)

    if isinstance(start, str):
        if start not in labels:
            raise ValueError(
                f"Unknown start label '{start}'. Available labels: {labels}"
            )
        start_idx = labels.index(start)
    elif isinstance(start, int) and not isinstance(start, bool):
        if start < 0 or start >= n:
            raise ValueError(f"start index {start} out of range [0, {n - 1}].")
        start_idx = start
    else:
        raise ValueError(f"start must be a string label or integer index, got {start!r}")

    if n == 1:
        c = matrix[0][0]
        if not math.isfinite(c):
            raise ValueError(f"Self-loop distance for '{labels[0]}' is not finite: {c}")
        c = int(c) if float(c).is_integer() else float(c)
        return TourResult([labels[0], labels[0]], c)

    visited = {start_idx}
    tour_indices = [start_idx]
    current = start_idx

    while len(visited) < n:
        best_candidate = None
        best_dist = float("inf")

        for candidate in range(n):
            if candidate not in visited:
                d = matrix[current][candidate]
                if math.isfinite(d) and d < best_dist:
                    best_dist = d
                    best_candidate = candidate

        if best_candidate is None:
            raise ValueError(
                f"No reachable unvisited node from '{labels[current]}' (visited {len(visited)} of {n} nodes)."
            )

        visited.add(best_candidate)
        tour_indices.append(best_candidate)
        current = best_candidate

    return_dist = matrix[current][start_idx]
    if not math.isfinite(return_dist):
        raise ValueError(
            f"No reachable return arc from '{labels[current]}' back to start '{labels[start_idx]}'."
        )

    tour_indices.append(start_idx)
    raw_cost = sum(matrix[tour_indices[i]][tour_indices[i + 1]] for i in range(len(tour_indices) - 1))
    cost = int(raw_cost) if float(raw_cost).is_integer() else float(raw_cost)
    tour_labels = [labels[idx] for idx in tour_indices]

    return TourResult(tour_labels, cost)


def greedy_assignment(scores: List[List[Union[int, float]]]) -> AssignmentResult:
    """Each weapon in order takes its best remaining boss. Return (pairs, total). Expected: 414."""
    num_rows = len(scores)
    if num_rows == 0:
        return AssignmentResult([], 0)

    num_cols = len(scores[0])
    if num_cols == 0:
        if all(len(row) == 0 for row in scores):
            return AssignmentResult([], 0)
        raise ValueError("scores rows must be non-empty.")

    for ri, row in enumerate(scores):
        if len(row) != num_cols:
            raise ValueError(
                f"scores must be rectangular: row {ri} has length {len(row)}, expected {num_cols}."
            )
        for ci, val in enumerate(row):
            if not isinstance(val, numbers.Real) or isinstance(val, bool) or not math.isfinite(val):
                raise ValueError(
                    f"scores[{ri}][{ci}] must be a finite number, got {val!r}."
                )

    assigned_cols = set()
    pairs = []
    total = 0

    for i in range(num_rows):
        best_col = None
        best_val = -float("inf")

        for j in range(num_cols):
            if j not in assigned_cols:
                val = scores[i][j]
                if val > best_val:
                    best_val = val
                    best_col = j

        if best_col is not None:
            assigned_cols.add(best_col)
            # 1-based indexing for pairs as required by API contract and fixtures
            pairs.append([i + 1, best_col + 1])
            total += best_val

    final_total = int(total) if float(total).is_integer() else float(total)
    return AssignmentResult(pairs, final_total)


def equal_split_crafting(scenario: Dict[str, Any], time_limit: Union[int, float]) -> Optional[CraftingPlan]:
    """Equal split of items, adjusted until feasible. Return (x, score) or None if infeasible.

    Follows decisions.md (#8):
    Start from x = (4, 4, 3, 3); while a <= constraint is violated move one unit
    from the item with the highest time per score to the one with the lowest;
    return None if 14 slots cannot be met.
    """
    recipes = scenario["recipes"]
    limits = scenario["limits"]
    slots = int(limits.get("slots", 14))
    score_vec = recipes["score"]
    time_vec = recipes["time"]
    weight_vec = recipes["weight"]
    stamina_vec = recipes["stamina"]
    survival_vec = recipes["survival"]
    num_items = len(score_vec)

    # Infeasibility check: even if all slots are the fastest item, can it fit within time_limit?
    min_time_per_item = min(time_vec)
    if time_limit < min_time_per_item * slots:
        return None

    # Default starting point: (4, 4, 3, 3) for 14 slots across 4 items, or generic equal partition
    if slots == 14 and num_items == 4:
        x = [4, 4, 3, 3]
    else:
        base = slots // num_items
        x = [base] * num_items
        for i in range(slots - sum(x)):
            x[i] += 1

    time_per_score = [
        (time_vec[i] / score_vec[i]) if score_vec[i] > 0 else float("inf")
        for i in range(num_items)
    ]

    def violates_constraints(curr_x: List[int]) -> bool:
        t = sum(curr_x[i] * time_vec[i] for i in range(num_items))
        if t > time_limit:
            return True
        w = sum(curr_x[i] * weight_vec[i] for i in range(num_items))
        if w > limits.get("weight", float("inf")):
            return True
        s = sum(curr_x[i] * stamina_vec[i] for i in range(num_items))
        if s > limits.get("stamina", float("inf")):
            return True
        surv = sum(curr_x[i] * survival_vec[i] for i in range(num_items))
        if surv < limits.get("survival_min", 0):
            return True
        return False

    max_adjustments = slots * num_items * 2
    step = 0

    while violates_constraints(x) and step < max_adjustments:
        step += 1
        # Move one unit from the item with the highest time per score (that has > 0 units)
        available_donors = [i for i in range(num_items) if x[i] > 0]
        if not available_donors:
            break
        from_idx = max(available_donors, key=lambda i: time_per_score[i])
        # To the item with the lowest time per score
        to_idx = min(range(num_items), key=lambda i: time_per_score[i])

        if from_idx == to_idx:
            # If the highest donor is already the lowest, cannot reduce further this way
            break

        x[from_idx] -= 1
        x[to_idx] += 1

    if violates_constraints(x):
        return None

    score = sum(x[i] * score_vec[i] for i in range(num_items))
    return CraftingPlan(x, score)
