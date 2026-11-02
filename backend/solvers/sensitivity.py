"""Part 2: Shadow prices from the final tableau, RHS ranging, bottleneck explanation.

Both functions read a *final* craft step (the last item of `steps`, see docs/api-contract.md) and the
answer's `constraint_names` (["time", "weight", "stamina", "survival", "slots"]).
Column naming convention (set by Part 1): constraint i (1-based) owns the column s<i> (slack, <=),
e<i> (surplus, >=) and/or a<i> (artificial, = and >=). The row `zrow["c"]` holds z_j - c_j.
"""

from __future__ import annotations


def _identify_column_for_constraint(i_1based: int, columns: list[str]) -> tuple[str, float] | None:
    """Find (column_name, sign) for constraint i.

    For slack s<i> (<= constraint): column represents +B^-1 u_i, reduced cost is y_i (sign +1).
    For artificial a<i> (equality or >= constraint): column represents +B^-1 u_i, reduced cost is y_i (sign +1).
    For surplus e<i> (>= constraint): column represents -B^-1 u_i, reduced cost is -y_i (sign -1).
    """
    s_col = f"s{i_1based}"
    if s_col in columns:
        return (s_col, 1.0)
    a_col = f"a{i_1based}"
    if a_col in columns:
        return (a_col, 1.0)
    e_col = f"e{i_1based}"
    if e_col in columns:
        return (e_col, -1.0)
    return None


def shadow_prices(final_step: dict, constraint_names: list[str]) -> dict[str, float]:
    """Return {constraint_name: price}.

    Expected for 50-min demo: time 0.75, weight 0.5, slots 4.25, stamina 0.0, survival 0.0.
    Negative prices are kept (they are meaningful for >= constraints).
    """
    columns: list[str] = final_step["columns"]
    zrow_c: list[float] = final_step["zrow"]["c"]

    prices = {}
    for i, name in enumerate(constraint_names, start=1):
        col_info = _identify_column_for_constraint(i, columns)
        if col_info:
            col_name, sign = col_info
            idx = columns.index(col_name)
            val = zrow_c[idx] * sign
            price = round(val, 4) if abs(val) > 1e-6 else 0.0
            prices[name] = price
        else:
            prices[name] = 0.0

    return prices


def rhs_ranging(
    final_step: dict,
    constraint_names: list[str],
    current_rhs: dict[str, float],
) -> dict[str, tuple[float | None, float | None]]:
    """Return {constraint_name: (lowest_rhs, highest_rhs)} over which the shadow price stays valid.

    Feasibility condition for basis B with change Δb:
        x_B + Δb * d >= 0  ==>  Δb * d_i >= -x_{B,i}

    ``current_rhs`` is required and must contain all constraint names in ``constraint_names``.
    Unbounded limits return None (e.g. (57.0, None) instead of inf) for clean JSON serialization.
    """
    columns: list[str] = final_step["columns"]
    basis: list[str] = final_step["basis"]
    tableau: list[list[float]] = final_step["tableau"]
    m_rows = len(basis)

    ranges = {}

    for i, name in enumerate(constraint_names, start=1):
        if name not in current_rhs:
            raise KeyError(f"current_rhs missing constraint name '{name}'")
        b_k = current_rhs[name]
        s_col = f"s{i}"
        e_col = f"e{i}"

        # If slack or surplus is currently in basis with positive value, constraint has surplus slack
        if s_col in basis:
            row_idx = basis.index(s_col)
            slack_val = tableau[row_idx][-1]
            if slack_val > 1e-6:
                ranges[name] = (round(b_k - slack_val, 2), None)
                continue
        if e_col in basis:
            row_idx = basis.index(e_col)
            surplus_val = tableau[row_idx][-1]
            if surplus_val > 1e-6:
                ranges[name] = (None, round(b_k + surplus_val, 2))
                continue

        # Binding constraint: read column of B^{-1} from slack, artificial, or surplus
        col_info = _identify_column_for_constraint(i, columns)
        if not col_info:
            ranges[name] = (b_k, b_k)
            continue

        col_name, sign = col_info
        c_idx = columns.index(col_name)
        min_delta = float("-inf")
        max_delta = float("inf")

        for r in range(m_rows):
            d_r = tableau[r][c_idx] * sign
            x_r = tableau[r][-1]

            if d_r > 1e-9:
                min_delta = max(min_delta, -x_r / d_r)
            elif d_r < -1e-9:
                max_delta = min(max_delta, -x_r / d_r)

        lower = round(b_k + min_delta, 2) if min_delta != float("-inf") else None
        upper = round(b_k + max_delta, 2) if max_delta != float("inf") else None
        ranges[name] = (lower, upper)

    return ranges


def binding_constraints(final_step: dict, constraint_names: list[str]) -> list[str]:
    """Derive binding constraints from basis membership (slack or surplus nonbasic or zero)."""
    columns: list[str] = final_step["columns"]
    basis: list[str] = final_step["basis"]
    tableau: list[list[float]] = final_step["tableau"]

    binding = []
    for i, name in enumerate(constraint_names, start=1):
        s_col = f"s{i}"
        e_col = f"e{i}"
        if s_col in columns:
            if s_col not in basis:
                binding.append(name)
            else:
                row_idx = basis.index(s_col)
                if abs(tableau[row_idx][-1]) <= 1e-6:
                    binding.append(name)
        elif e_col in columns:
            if e_col not in basis:
                binding.append(name)
            else:
                row_idx = basis.index(e_col)
                if abs(tableau[row_idx][-1]) <= 1e-6:
                    binding.append(name)
        else:
            # Equality constraint (has no slack or surplus column, always tight)
            binding.append(name)
    return binding


def bottleneck_text(shadow_prices_by_constraint: dict[str, float]) -> str:
    """One readable sentence naming the constraint with the largest per-unit effect."""
    time_price = shadow_prices_by_constraint.get("time", 0.0)
    if time_price > 0:
        return f"Crafting time is the bottleneck: each extra minute adds {time_price:g} score."

    active = {k: v for k, v in shadow_prices_by_constraint.items() if v > 0}
    if not active:
        return "No constraints are actively bottlenecking the crafting score."
    top = max(active.items(), key=lambda kv: kv[1])
    return f"{top[0].capitalize()} is the bottleneck: each extra unit adds {top[1]:g} score."
