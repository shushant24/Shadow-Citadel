"""Part 3: Hungarian assignment engine.

Implements the Hungarian method without external optimization libraries.
The returned envelope and step fields follow the Shadow-Citadel backend contract.
All public indices in pairs, selected, covered_rows, covered_cols, dummy_rows,
dummy_cols and unassigned lists are 1-based.
"""
from __future__ import annotations

import math
from numbers import Real
from typing import Any, Sequence

from envelope import envelope

_EPS = 1e-9
Matrix = list[list[float]]


class AssignmentError(ValueError):
    """Raised when an assignment matrix or option is invalid."""


def _number(value: float) -> int | float:
    """Avoid emitting values such as 2.0 when the result is integral."""
    nearest = round(value)
    if abs(value - nearest) <= _EPS:
        return int(nearest)
    return float(value)


def _matrix_numbers(matrix: Matrix) -> list[list[int | float]]:
    return [[_number(value) for value in row] for row in matrix]


def _is_zero(value: float) -> bool:
    return abs(value) <= _EPS


def _validate(scores: Sequence[Sequence[Real]], maximize: bool) -> Matrix:
    if not isinstance(maximize, bool):
        raise AssignmentError("maximize must be a boolean.")
    if isinstance(scores, (str, bytes)) or not isinstance(scores, Sequence) or len(scores) == 0:
        raise AssignmentError("scores must be a non-empty rectangular matrix.")

    result: Matrix = []
    width: int | None = None
    for ri, row in enumerate(scores, start=1):
        if isinstance(row, (str, bytes)) or not isinstance(row, Sequence) or len(row) == 0:
            raise AssignmentError(f"scores row {ri} must be a non-empty list.")
        if width is None:
            width = len(row)
        elif len(row) != width:
            raise AssignmentError("scores must be rectangular: every row needs the same number of columns.")

        values: list[float] = []
        for ci, value in enumerate(row, start=1):
            if isinstance(value, bool) or not isinstance(value, Real):
                raise AssignmentError(f"scores[{ri}][{ci}] must be a finite number.")
            numeric = float(value)
            if not math.isfinite(numeric):
                raise AssignmentError(f"scores[{ri}][{ci}] must be a finite number.")
            values.append(numeric)
        result.append(values)
    return result


def _maximum_zero_matching(matrix: Matrix) -> list[tuple[int, int]]:
    """Find a maximum independent set of zero cells with deterministic DFS."""
    size = len(matrix)
    col_to_row = [-1] * size

    def augment(row: int, visited_cols: list[bool]) -> bool:
        for col in range(size):
            if visited_cols[col] or not _is_zero(matrix[row][col]):
                continue
            visited_cols[col] = True
            prior_row = col_to_row[col]
            if prior_row == -1 or augment(prior_row, visited_cols):
                col_to_row[col] = row
                return True
        return False

    for row in range(size):
        augment(row, [False] * size)
    return sorted((row, col) for col, row in enumerate(col_to_row) if row != -1)


def _minimum_line_cover(
    matrix: Matrix, matching: list[tuple[int, int]]
) -> tuple[list[int], list[int]]:
    """Return Konig's minimum zero-cover as zero-based row/column indexes."""
    size = len(matrix)
    row_to_col = {row: col for row, col in matching}
    col_to_row = {col: row for row, col in matching}

    # Reach alternating paths from every unmatched row: non-matching zero edges
    # row -> column, then matching edges column -> row.
    reachable_rows = {row for row in range(size) if row not in row_to_col}
    reachable_cols: set[int] = set()
    stack: list[tuple[str, int]] = [("row", row) for row in sorted(reachable_rows)]

    while stack:
        kind, index = stack.pop()
        if kind == "row":
            matched_col = row_to_col.get(index)
            for col in range(size):
                if col == matched_col or not _is_zero(matrix[index][col]):
                    continue
                if col not in reachable_cols:
                    reachable_cols.add(col)
                    stack.append(("col", col))
        else:
            matched_row = col_to_row.get(index)
            if matched_row is not None and matched_row not in reachable_rows:
                reachable_rows.add(matched_row)
                stack.append(("row", matched_row))

    covered_rows = [row for row in range(size) if row not in reachable_rows]
    covered_cols = sorted(reachable_cols)
    return covered_rows, covered_cols


def solve_assignment(scores: Sequence[Sequence[Real]], maximize: bool = True) -> dict[str, Any]:
    """Solve a rectangular assignment problem and return an API result envelope.

    Rectangular inputs are padded to a square with zero-valued dummy rows or
    columns. Dummy assignments are included only in the final step's ``selected``
    list; they are omitted from the answer's real ``pairs``.
    """
    original = _validate(scores, maximize)
    row_count, col_count = len(original), len(original[0])
    size = max(row_count, col_count)
    dummy_rows = list(range(row_count + 1, size + 1))
    dummy_cols = list(range(col_count + 1, size + 1))

    # The assignment objective is unchanged if dummy cells have zero transformed
    # cost: the number of dummy matches is fixed by the matrix shape. This also
    # matches the repository's reference fixtures.
    working: Matrix = [[0.0 for _ in range(size)] for _ in range(size)]
    if maximize:
        p_max = max(value for row in original for value in row)
        for ri in range(row_count):
            for ci in range(col_count):
                working[ri][ci] = p_max - original[ri][ci]
        note = f"c_ij = P_max - p_ij with P_max = {_number(p_max)}"
    else:
        for ri in range(row_count):
            for ci in range(col_count):
                working[ri][ci] = original[ri][ci]
        note = "Minimization costs used directly"

    if dummy_rows or dummy_cols:
        note += " ; dummy zero row/column added"

    steps: list[dict[str, Any]] = []

    def add_step(
        phase: str,
        step_note: str,
        *,
        covered_rows: Sequence[int] = (),
        covered_cols: Sequence[int] = (),
        extra: dict[str, Any] | None = None,
    ) -> None:
        item: dict[str, Any] = {
            "phase": phase,
            "matrix": _matrix_numbers(working),
            "covered_rows": [i + 1 for i in covered_rows],
            "covered_cols": [i + 1 for i in covered_cols],
            "dummy_rows": dummy_rows[:],
            "dummy_cols": dummy_cols[:],
            "note": step_note,
        }
        if extra:
            item.update(extra)
        steps.append(item)

    if maximize:
        add_step("convert", note)

    # Row and column reductions.
    for ri in range(size):
        minimum = min(working[ri])
        working[ri] = [value - minimum for value in working[ri]]
        working[ri] = [0.0 if _is_zero(value) else value for value in working[ri]]
    add_step("row_reduce", "Subtract the minimum of each row from every value in that row.")

    for ci in range(size):
        minimum = min(working[ri][ci] for ri in range(size))
        for ri in range(size):
            working[ri][ci] -= minimum
            if _is_zero(working[ri][ci]):
                working[ri][ci] = 0.0
    add_step("col_reduce", "Subtract the minimum of each column from every value in that column.")

    # Cover zeros with a minimum number of lines. If fewer than N lines are
    # needed, adjust uncovered cells and repeat; otherwise a perfect assignment
    # exists among the zeros and the algorithm is complete.
    max_iterations = max(100, size * size * size * 10)
    selected: list[tuple[int, int]] = []
    for iteration in range(max_iterations):
        selected = _maximum_zero_matching(working)
        covered_rows, covered_cols = _minimum_line_cover(working, selected)
        line_count = len(covered_rows) + len(covered_cols)
        add_step(
            "cover",
            f"Cover all zeros with a minimum number of lines ({line_count} of {size}).",
            covered_rows=covered_rows,
            covered_cols=covered_cols,
        )

        if len(selected) == size:
            break

        row_set, col_set = set(covered_rows), set(covered_cols)
        uncovered = [
            working[ri][ci]
            for ri in range(size)
            if ri not in row_set
            for ci in range(size)
            if ci not in col_set
        ]
        if not uncovered:
            raise RuntimeError("Hungarian adjustment failed: no uncovered cells remain.")
        delta = min(uncovered)
        if delta < -_EPS:
            raise RuntimeError("Hungarian adjustment encountered a negative uncovered value.")
        if _is_zero(delta):
            raise RuntimeError("Hungarian adjustment found an uncovered zero; the zero cover is inconsistent.")

        # Subtract delta from uncovered cells and add delta at intersections of
        # two covering lines; cells covered by exactly one line stay unchanged.
        for ri in range(size):
            for ci in range(size):
                if ri not in row_set and ci not in col_set:
                    working[ri][ci] -= delta
                elif ri in row_set and ci in col_set:
                    working[ri][ci] += delta
                if _is_zero(working[ri][ci]):
                    working[ri][ci] = 0.0

        add_step(
            "adjust",
            "Subtract delta from uncovered cells and add it at intersections of two covering lines.",
            covered_rows=covered_rows,
            covered_cols=covered_cols,
            extra={"delta": _number(delta)},
        )
    else:
        raise RuntimeError("Hungarian solver exceeded its iteration safety limit.")

    # Make a final selected list with all padded matches, including dummy matches.
    selected.sort(key=lambda pair: pair[0])
    selected_1based = [[ri + 1, ci + 1] for ri, ci in selected]
    real_pairs = [
        (ri, ci) for ri, ci in selected if ri < row_count and ci < col_count
    ]
    real_pairs.sort(key=lambda pair: pair[0])
    assigned_rows = {ri for ri, _ in real_pairs}
    assigned_cols = {ci for _, ci in real_pairs}
    total = sum(original[ri][ci] for ri, ci in real_pairs)

    answer = {
        "pairs": [[ri + 1, ci + 1] for ri, ci in real_pairs],
        "total": _number(total),
        "unassigned": {
            "rows": [ri + 1 for ri in range(row_count) if ri not in assigned_rows],
            "cols": [ci + 1 for ci in range(col_count) if ci not in assigned_cols],
        },
    }

    add_step(
        "final",
        "The selected zero cells define the optimal assignment; dummy matches are included in selected.",
        extra={"selected": selected_1based},
    )
    return envelope("optimal", answer, steps)


__all__ = ["AssignmentError", "solve_assignment"]
