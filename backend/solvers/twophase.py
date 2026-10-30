"""Part 1: Two-Phase mode."""

from __future__ import annotations

from envelope import envelope
from solvers.simplex import Tableau, validate_inputs


def solve_twophase(c, A, b, senses, maximize=True):
    """Same inputs, naming and envelope as solve_bigm, with phase = "phase1" then "phase2".

    Phase 1 minimizes the sum of artificials; zrow["m"] is all zeros in both phases.
    Keep the artificial columns in the phase 2 tableau (they may not re-enter) so the price of an
    equality constraint (slots) can still be read from column a<i>. See fixtures/craft_twophase.json.
    Infeasible: phase 1 ends with a positive objective.
    """
    validate_inputs(c, A, b, senses)

    n_vars = len(c)
    m_cons = len(A)

    # Ensure all RHS >= 0
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

    # Build column names
    columns: list[str] = [f"x{j+1}" for j in range(n_vars)]
    slack_surplus_cols: list[tuple[str, int]] = []
    artificial_cols: list[tuple[str, int]] = []

    for i in range(m_cons):
        if senses[i] == "<=":
            slack_surplus_cols.append((f"s{i+1}", i))
        elif senses[i] == ">=":
            slack_surplus_cols.append((f"e{i+1}", i))
            artificial_cols.append((f"a{i+1}", i))
        elif senses[i] == "=":
            artificial_cols.append((f"a{i+1}", i))

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
        row = [0.0] * (n_total + 1)
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

    # ================================================================ Phase 1
    # Objective: minimize sum of artificial variables (maximize -sum(a_i))
    zrow_c_p1 = [0.0] * (n_total + 1)
    zrow_m_p1 = [0.0] * (n_total + 1)  # always zero in two-phase

    for name, _ in artificial_cols:
        col_idx = col_idx_map[name]
        zrow_c_p1[col_idx] = 1.0  # will be eliminated by basis rows

    # Eliminate basic artificials from z-row
    for name, _ in artificial_cols:
        col_idx = col_idx_map[name]
        if name in basis:
            row_idx = basis.index(name)
            factor = zrow_c_p1[col_idx]
            if abs(factor) > 1e-15:
                for k in range(n_total + 1):
                    zrow_c_p1[k] -= factor * tab[row_idx][k]

    for k in range(n_total + 1):
        if abs(zrow_c_p1[k]) < 1e-12:
            zrow_c_p1[k] = 0.0

    tableau_p1 = Tableau(columns, basis, tab, zrow_c_p1, zrow_m_p1, phase="phase1")
    status_p1 = tableau_p1.solve()

    if status_p1 == "iteration_limit":
        raise RuntimeError("Simplex iteration limit reached in Phase 1.")

    # Check Phase 1 result
    if status_p1 == "optimal":
        p1_obj = tableau_p1.zrow_c[-1]
        if p1_obj < -1e-8:
            return envelope("infeasible",
                            message="Phase 1 ended with a positive sum of artificials: "
                                    "the constraints are infeasible.",
                            steps=list(tableau_p1.steps))
    elif status_p1 == "unbounded":
        return envelope("infeasible",
                        message="Phase 1 is unbounded (should not happen).",
                        steps=list(tableau_p1.steps))

    # Drive any artificial variables remaining in the basis at level 0 out of the basis
    # and record any drive-out pivots into the step trace
    art_names = {name for name, _ in artificial_cols}
    for i in range(tableau_p1.n_rows):
        if tableau_p1.basis[i] in art_names:
            # Look for a non-artificial candidate column to pivot on
            for j in range(tableau_p1.n_cols):
                col_name = tableau_p1.columns[j]
                if col_name not in art_names and col_name not in tableau_p1.basis:
                    if abs(tableau_p1.tab[i][j]) > 1e-10:
                        tableau_p1.pivot_recorded(i, j)
                        break

    steps = list(tableau_p1.steps)

    # ================================================================ Phase 2
    sign = 1.0 if maximize else -1.0

    zrow_c_p2 = [0.0] * (n_total + 1)
    zrow_m_p2 = [0.0] * (n_total + 1)

    for j in range(n_vars):
        zrow_c_p2[j] = -sign * float(c[j])

    # Eliminate basic variables from Phase 2 z-row
    for i, bv in enumerate(tableau_p1.basis):
        col_idx = col_idx_map[bv]
        factor = zrow_c_p2[col_idx]
        if abs(factor) > 1e-15:
            for k in range(n_total + 1):
                zrow_c_p2[k] -= factor * tableau_p1.tab[i][k]

    for k in range(n_total + 1):
        if abs(zrow_c_p2[k]) < 1e-12:
            zrow_c_p2[k] = 0.0

    # Artificial variables are frozen from re-entering during Phase 2
    tableau_p2 = Tableau(
        list(tableau_p1.columns),
        list(tableau_p1.basis),
        [list(row) for row in tableau_p1.tab],
        zrow_c_p2,
        zrow_m_p2,
        phase="phase2",
        excluded_columns=art_names,
    )
    tableau_p2._iteration = tableau_p1._iteration

    status_p2 = tableau_p2.solve()

    if status_p2 == "iteration_limit":
        raise RuntimeError("Simplex iteration limit reached in Phase 2.")

    steps.extend(tableau_p2.steps)

    if status_p2 == "unbounded":
        return envelope("unbounded", message="The LP is unbounded.", steps=steps)

    if status_p2 == "optimal":
        x = [0.0] * n_vars
        for i, bv in enumerate(tableau_p2.basis):
            if bv.startswith("x"):
                idx = int(bv[1:]) - 1
                if 0 <= idx < n_vars:
                    x[idx] = _round_val(tableau_p2.tab[i][-1])

        z = _round_val(sign * tableau_p2.zrow_c[-1])
        return envelope("optimal", answer={"x": x, "z": z}, steps=steps)

    raise RuntimeError(f"Unexpected solver status: {status_p2}")


def _round_val(v: float, tol: float = 1e-9) -> float:
    """Round to nearest integer if very close, otherwise keep float."""
    rounded = round(v)
    if abs(v - rounded) < tol:
        return float(rounded)
    return round(v, 6)
