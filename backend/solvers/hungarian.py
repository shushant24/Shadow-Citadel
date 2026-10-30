"""Part 3: Hungarian engine: reduction, line covering, maximization conversion, dummy rows/cols, per-phase steps."""


def solve_assignment(scores, maximize=True):
    """Return an envelope.

    answer: pairs [[weapon, boss], ...] (1-indexed, dummy pairs left out), total (computed on the ORIGINAL scores),
            unassigned {"rows": [...], "cols": [...]} (1-indexed originals that got a dummy; both empty when square).
    steps:  phases in order: convert, row_reduce, col_reduce, then (cover, adjust)* ending with cover, then final.
            ALL indices in this endpoint are 1-based (pairs, covered_rows, covered_cols, dummy_rows, dummy_cols,
            selected). Every step carries the full current matrix (padded to square) plus dummy_rows / dummy_cols;
            `adjust` also carries delta; `final` carries selected (pairs of the chosen zeros, dummies included).
    Reference traces: fixtures/assign.json, assign_unbalanced.json (5 weapons x 4 bosses), assign_adjust.json.
    """
    raise NotImplementedError("Part 3")
