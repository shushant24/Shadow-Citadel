"""Part 1: Big-M mode: surplus and artificial variables."""

from __future__ import annotations

from envelope import envelope
from solvers.simplex import Tableau


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

    # Auxiliary variable tracking per constraint (1-based naming)
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

    # Build the tableau rows
    tab = []
    basis: list[str] = []

    for i in range(m_cons):
        row = [0.0] * (n_total + 1)  # +1 for RHS
        # Decision variable coefficients
        for j in range(n_vars):
            row[j] = float(A[i][j])
        # RHS
        row[-1] = float(b[i])

        # Slack/surplus columns
        for name, ci in slack_surplus_cols:
            col_idx = columns.index(name)
            if ci == i:
                if senses[i] == "<=":
                    row[col_idx] = 1.0
                elif senses[i] == ">=":
                    row[col_idx] = -1.0  # surplus variable has -1

        # Artificial columns
        for name, ci in artificial_cols:
            col_idx = columns.index(name)
            if ci == i:
                row[col_idx] = 1.0

        tab.append(row)

        # Determine basis variable for this row
        if senses[i] == "<=":
            basis.append(f"s{i+1}")
        else:
            # >= or = : artificial is the initial basic variable
            basis.append(f"a{i+1}")

    # Build the z-row
    # For maximization: we maximize c^T x, so z_j - c_j for decision vars = -c_j (real part)
    # For Big-M: artificials get a massive penalty, so z_j - c_j for artificial a_i has m-component = 0 initially
    # Actually: the objective is max c^T x - M * sum(artificials)
    # z_j - c_j row initially (before making basis columns identity in z-row):
    #   For x_j:   z_j - c_j = 0 - c_j = -c_j  (real part), m part = 0
    #   For s/e:   z_j - c_j = 0 - 0   = 0
    #   For a_j:   z_j - c_j = 0 - (-M) = M    =>  m part = 1, c part = 0

    sign = 1.0 if maximize else -1.0

    zrow_c = [0.0] * (n_total + 1)
    zrow_m = [0.0] * (n_total + 1)

    # Decision variables: z_j - c_j = -sign * c_j (we want to maximize sign * c^T x)
    for j in range(n_vars):
        zrow_c[j] = -sign * float(c[j])

    # Artificial variables: coefficient in objective is -M (penalty)
    # So z_j - c_j for artificial = 0 - (-M) = M  =>  m = 1
    # But wait — we need to make the z-row consistent with the initial basis.
    # The artificials are in the basis, so we need to eliminate them from the z-row.
    # For each artificial in the basis, add M * (that row) to the m-part of z-row,
    # and add the real cost * (that row) to the c-part.

    # First, set the raw costs in z-row for artificial columns
    for name, ci in artificial_cols:
        col_idx = columns.index(name)
        # The artificial has cost +M in objective (penalty), so z_j - c_j = 0 - (-M) = M
        # But since it's in the basis, we need to eliminate.
        # Actually, let's build it properly:
        # The objective function is: max sign * (c^T x) - M * sum(a)
        # In z_j - c_j form: for column j, z_j - c_j = (sum of basis costs * column j) - cost_j
        # Initial z_j - c_j (before basis elimination) = -cost_j for non-basic
        # For artificial: cost = -M => z_j - c_j = -(-M) = M => m=1, c=0
        zrow_m[col_idx] = 1.0  # will be zeroed out by elimination below

    # Now eliminate basis columns from z-row
    # For each basic variable, if it's an artificial, we need to subtract M * row from m-zrow
    # and add sign*c_j * row to c-zrow... Actually, let's just do it properly:
    # Since artificials are in basis with cost -M, and we set zrow_m[a_col] = 1 above,
    # we add (-1) * M * row_i to zrow => subtract row from m-part
    # (because the basis variable a_i has z_j - c_j that should be 0 for the basis column)

    for name, ci in artificial_cols:
        col_idx = columns.index(name)
        row_idx = basis.index(name)
        # Eliminate from m-part: zrow_m -= zrow_m[col_idx] * tab[row_idx]
        factor_m = zrow_m[col_idx]
        if abs(factor_m) > 1e-15:
            for k in range(n_total + 1):
                zrow_m[k] -= factor_m * tab[row_idx][k]

    # Also eliminate from c-part for basic variables with non-zero c-cost
    # Artificial variables have c-cost = 0 in the real part, so no elimination needed for them.
    # But we need to check if any slack/surplus variables that are basic have non-zero cost (they don't).
    # Decision variables aren't initially basic, so nothing to do for c-part from basis.
    # Actually, let me reconsider: the initial z-row c-part is [-sign*c1, -sign*c2, ..., 0, 0, ..., 0, 0]
    # None of these variables are in the initial basis (only s_i and a_i are), so no elimination
    # is needed for the c-part — the z-row is already consistent for the c-part.

    # Create and solve the Tableau
    tableau = Tableau(columns, basis, tab, zrow_c, zrow_m, phase="bigm")
    status = tableau.solve()

    steps = tableau.steps

    if status == "unbounded":
        return envelope("unbounded", message="The LP is unbounded.", steps=steps)

    if status == "optimal":
        # Check for infeasibility: any artificial still in basis at positive level?
        art_names = {name for name, _ in artificial_cols}
        infeasible = False
        for i, bv in enumerate(tableau.basis):
            if bv in art_names and tableau.tab[i][-1] > 1e-8:
                infeasible = True
                break

        if infeasible:
            return envelope("infeasible",
                            message="With the given constraints the plan is infeasible: "
                                    "an artificial variable stays in the final basis at a positive level.",
                            steps=steps)

        # Extract solution
        x = [0.0] * n_vars
        for i, bv in enumerate(tableau.basis):
            if bv.startswith("x"):
                idx = int(bv[1:]) - 1
                if 0 <= idx < n_vars:
                    x[idx] = _round_val(tableau.tab[i][-1])

        z = _round_val(sign * tableau.zrow_c[-1])

        return envelope("optimal", answer={"x": x, "z": z}, steps=steps)

    # Fallback
    return envelope("infeasible", message="Solver did not converge.", steps=steps)


def _round_val(v: float, tol: float = 1e-9) -> float:
    """Round to nearest integer if very close, otherwise keep float."""
    rounded = round(v)
    if abs(v - rounded) < tol:
        return float(rounded)
    return round(v, 6)
