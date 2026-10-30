"""Part 1: Big-M mode: surplus and artificial variables."""

from __future__ import annotations

from envelope import envelope
from solvers.simplex import Tableau, validate_inputs


def solve_bigm(c, A, b, senses, maximize=True):
    """senses: list of "<=", ">=" or "=". Return an envelope.

    answer: x, z, plus whatever Part 2 adds (see docs/api-contract.md for the final /api/craft answer).
    steps:  one item per tableau (iteration 0 = initial, one per pivot, last = optimal tableau). Each item follows
            the craft step format: columns, basis, tableau (constraint rows, last entry = RHS), zrow {"c", "m"},
            entering, leaving, pivot [row, col], z, z_m, phase = "bigm".
    Naming: decision x1..xn, then for constraint i (1-based) s<i> (slack for <=), e<i> (surplus for >=),
            a<i> (artificial for >= and =). Columns are ordered x, then s/e in constraint order, then a.
    Big-M is kept SYMBOLIC: zrow holds z_j - c_j as  m*M + c  (arrays "m" and "c"), compare (m, c) lexicographically.
    Infeasible: optimal tableau still has an artificial variable in the basis at a positive level.
    """
    validate_inputs(c, A, b, senses)

    n_vars = len(c)
    m_cons = len(A)

    # Ensure all RHS >= 0 (multiply by -1 if needed, flip sense)
    A = [list(row) for row in A]
    b = list(b)
    senses = list(senses)
    for i in range(m_cons):
        if b[i] < 0:
            A[i] = [-a for a in A[i]]
            b[i] = -b[i]
            if senses[i] == "<=":
                senses[i] = ">="
            elif senses[i] == ">=":
                senses[i] = "<="

    # Build column names and identify slack/surplus/artificial positions
    columns: list[str] = [f"x{j+1}" for j in range(n_vars)]

    slack_surplus_cols: list[tuple[str, int]] = []  # (name, constraint_0based_index)
    artificial_cols: list[tuple[str, int]] = []

    for i in range(m_cons):
        if senses[i] == "<=":
            slack_surplus_cols.append((f"s{i+1}", i))
        elif senses[i] == ">=":
            slack_surplus_cols.append((f"e{i+1}", i))
            artificial_cols.append((f"a{i+1}", i))
        elif senses[i] == "=":
            artificial_cols.append((f"a{i+1}", i))

    # Column order: x1..xn, then s/e in constraint order, then a in constraint order
    for name, _ in slack_surplus_cols:
        columns.append(name)
    for name, _ in artificial_cols:
        columns.append(name)

    n_total = len(columns)
    col_idx_map = {name: idx for idx, name in enumerate(columns)}

    # Build the tableau rows
    tab = []
    basis: list[str] = []

    for i in range(m_cons):
        row = [0.0] * (n_total + 1)  # +1 for RHS
        for j in range(n_vars):
            row[j] = float(A[i][j])
        row[-1] = float(b[i])

        for name, ci in slack_surplus_cols:
            if ci == i:
                col_idx = col_idx_map[name]
                row[col_idx] = 1.0 if senses[i] == "<=" else -1.0

        for name, ci in artificial_cols:
            if ci == i:
                col_idx = col_idx_map[name]
                row[col_idx] = 1.0

        tab.append(row)

        if senses[i] == "<=":
            basis.append(f"s{i+1}")
        else:
            basis.append(f"a{i+1}")

    sign = 1.0 if maximize else -1.0

    zrow_c = [0.0] * (n_total + 1)
    zrow_m = [0.0] * (n_total + 1)

    for j in range(n_vars):
        zrow_c[j] = -sign * float(c[j])

    for name, ci in artificial_cols:
        col_idx = col_idx_map[name]
        zrow_m[col_idx] = 1.0

    # Eliminate basis columns from m-part of z-row
    for name, ci in artificial_cols:
        col_idx = col_idx_map[name]
        row_idx = basis.index(name)
        factor_m = zrow_m[col_idx]
        if abs(factor_m) > 1e-15:
            for k in range(n_total + 1):
                zrow_m[k] -= factor_m * tab[row_idx][k]

    tableau = Tableau(columns, basis, tab, zrow_c, zrow_m, phase="bigm")
    status = tableau.solve()

    steps = tableau.steps

    if status == "iteration_limit":
        raise RuntimeError("Simplex iteration limit reached without convergence.")

    # Check for infeasibility: if an artificial remains in the basis at a positive level,
    # the problem is infeasible (even if an unbounded direction also exists).
    art_names = {name for name, _ in artificial_cols}
    art_positive = any(
        bv in art_names and tableau.tab[i][-1] > 1e-8
        for i, bv in enumerate(tableau.basis)
    )

    if art_positive:
        return envelope("infeasible",
                        message="With the given constraints the plan is infeasible: "
                                "an artificial variable stays in the final basis at a positive level.",
                        steps=steps)

    if status == "unbounded":
        return envelope("unbounded", message="The LP is unbounded.", steps=steps)

    if status == "optimal":
        x = [0.0] * n_vars
        for i, bv in enumerate(tableau.basis):
            if bv.startswith("x"):
                idx = int(bv[1:]) - 1
                if 0 <= idx < n_vars:
                    x[idx] = _round_val(tableau.tab[i][-1])

        z = _round_val(sign * tableau.zrow_c[-1])
        return envelope("optimal", answer={"x": x, "z": z}, steps=steps)

    raise RuntimeError(f"Unexpected solver status: {status}")


def _round_val(v: float, tol: float = 1e-9) -> float:
    """Round to nearest integer if very close, otherwise keep float."""
    rounded = round(v)
    if abs(v - rounded) < tol:
        return float(rounded)
    return round(v, 6)
