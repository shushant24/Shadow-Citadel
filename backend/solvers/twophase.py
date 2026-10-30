"""Part 1: Two-Phase mode."""

from __future__ import annotations

from envelope import envelope
from solvers.simplex import Tableau


def solve_twophase(c, A, b, senses, maximize=True):
    """Same inputs, naming and envelope as solve_bigm, with phase = "phase1" then "phase2".

    Phase 1 minimizes the sum of artificials; zrow["m"] is all zeros in both phases.
    Keep the artificial columns in the phase 2 tableau (they may not re-enter) so the price of an
    equality constraint (slots) can still be read from column a<i>. See fixtures/craft_twophase.json.
    Infeasible: phase 1 ends with a positive objective.
    """
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

    # Build the tableau rows (same as bigm)
    tab = []
    basis: list[str] = []

    for i in range(m_cons):
        row = [0.0] * (n_total + 1)
        for j in range(n_vars):
            row[j] = float(A[i][j])
        row[-1] = float(b[i])

        for name, ci in slack_surplus_cols:
            col_idx = columns.index(name)
            if ci == i:
                if senses[i] == "<=":
                    row[col_idx] = 1.0
                elif senses[i] == ">=":
                    row[col_idx] = -1.0

        for name, ci in artificial_cols:
            col_idx = columns.index(name)
            if ci == i:
                row[col_idx] = 1.0

        tab.append(row)

        if senses[i] == "<=":
            basis.append(f"s{i+1}")
        else:
            basis.append(f"a{i+1}")

    # ================================================================ Phase 1
    # Objective: minimize sum of artificial variables
    # z_j - c_j for Phase 1: cost of artificials = 1, everything else = 0
    # Initial z_j - c_j = -cost_j for non-basic columns
    # For artificials (basic): cost = 1, need to eliminate from z-row

    zrow_c_p1 = [0.0] * (n_total + 1)
    zrow_m_p1 = [0.0] * (n_total + 1)  # always zero in two-phase

    # Set costs for artificial columns in z-row (before basis elimination)
    # Phase 1 minimizes sum(a_i), so cost of a_i = 1
    # z_j - c_j for a_i = 0 - (-1) = 1  (we minimize, so objective row has -cost)
    # Actually in the standard min form: z_j - c_j = -c_j for non-basic vars
    # where c_j = -1 for artificials (we want to minimize sum, which is maximize negative sum)
    # Let me think about this more carefully.
    #
    # We minimize w = sum(a_i). In z-row form (maximize -w = -sum(a_i)):
    # z_j - c_j for a_i: c_i = -1 in max form, so z_j - c_j = 0 - (-1) = 1
    # For everything else: c_j = 0, so z_j - c_j = 0
    # Then we eliminate the basic artificials.

    for name, _ in artificial_cols:
        col_idx = columns.index(name)
        zrow_c_p1[col_idx] = 1.0  # will be eliminated

    # Eliminate basic artificials from z-row
    for name, _ in artificial_cols:
        col_idx = columns.index(name)
        if name in basis:
            row_idx = basis.index(name)
            factor = zrow_c_p1[col_idx]
            if abs(factor) > 1e-15:
                for k in range(n_total + 1):
                    zrow_c_p1[k] -= factor * tab[row_idx][k]

    # Clean near-zeros
    for k in range(n_total + 1):
        if abs(zrow_c_p1[k]) < 1e-12:
            zrow_c_p1[k] = 0.0

    # Solve Phase 1
    tableau_p1 = Tableau(columns, basis, tab, zrow_c_p1, zrow_m_p1, phase="phase1")
    status_p1 = tableau_p1.solve()

    steps = list(tableau_p1.steps)

    # Check Phase 1 result
    # Phase 1 is "optimal" when z_j - c_j are all non-negative
    # The objective value (z = zrow_c[-1]) should be 0 if feasible
    # (since we're maximizing -sum(a), optimal = 0 means all artificials = 0)
    if status_p1 == "optimal":
        p1_obj = tableau_p1.zrow_c[-1]
        # z = -sum(a_i) at optimum. If z < 0 (i.e., sum(a) > 0), infeasible.
        if p1_obj < -1e-8:
            return envelope("infeasible",
                            message="Phase 1 ended with a positive sum of artificials: "
                                    "the constraints are infeasible.",
                            steps=steps)
    elif status_p1 == "unbounded":
        return envelope("infeasible",
                        message="Phase 1 is unbounded (should not happen).",
                        steps=steps)

    # ================================================================ Phase 2
    # Use the final basis and tableau from Phase 1, but rebuild the z-row for the original objective.
    # Keep artificial columns (they may not re-enter the basis, but we need them for dual prices).

    sign = 1.0 if maximize else -1.0

    # Build the Phase 2 z-row from scratch using the original objective
    zrow_c_p2 = [0.0] * (n_total + 1)
    zrow_m_p2 = [0.0] * (n_total + 1)

    # Initial z_j - c_j = -sign * c_j for decision variables
    for j in range(n_vars):
        zrow_c_p2[j] = -sign * float(c[j])

    # Artificial variables must not re-enter: give them a large z_j - c_j?
    # No — per the fixture, artificials are just kept as columns with z_j - c_j
    # naturally computed. They won't re-enter because their reduced costs will be non-negative
    # (the contract says keep them for reading dual prices).

    # Eliminate basic variables from z-row
    for i, bv in enumerate(tableau_p1.basis):
        col_idx = tableau_p1.columns.index(bv)
        factor = zrow_c_p2[col_idx]
        if abs(factor) > 1e-15:
            for k in range(n_total + 1):
                zrow_c_p2[k] -= factor * tableau_p1.tab[i][k]

    # Clean near-zeros
    for k in range(n_total + 1):
        if abs(zrow_c_p2[k]) < 1e-12:
            zrow_c_p2[k] = 0.0

    # Create Phase 2 tableau using the basis/tab state from end of Phase 1
    tableau_p2 = Tableau(
        list(tableau_p1.columns),
        list(tableau_p1.basis),
        [list(row) for row in tableau_p1.tab],
        zrow_c_p2,
        zrow_m_p2,
        phase="phase2",
    )
    # Continue iteration numbering from Phase 1
    tableau_p2._iteration = tableau_p1._iteration

    status_p2 = tableau_p2.solve()

    steps.extend(tableau_p2.steps)

    if status_p2 == "unbounded":
        return envelope("unbounded", message="The LP is unbounded.", steps=steps)

    if status_p2 == "optimal":
        # Extract solution
        x = [0.0] * n_vars
        for i, bv in enumerate(tableau_p2.basis):
            if bv.startswith("x"):
                idx = int(bv[1:]) - 1
                if 0 <= idx < n_vars:
                    x[idx] = _round_val(tableau_p2.tab[i][-1])

        z = _round_val(sign * tableau_p2.zrow_c[-1])

        return envelope("optimal", answer={"x": x, "z": z}, steps=steps)

    return envelope("infeasible", message="Solver did not converge.", steps=steps)


def _round_val(v: float, tol: float = 1e-9) -> float:
    """Round to nearest integer if very close, otherwise keep float."""
    rounded = round(v)
    if abs(v - rounded) < tol:
        return float(rounded)
    return round(v, 6)
