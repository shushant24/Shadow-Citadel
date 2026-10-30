"""Part 2: Shadow prices from the final tableau, RHS ranging, bottleneck explanation.

Both functions read a *final* craft step (the last item of `steps`, see docs/api-contract.md) and the
answer's `constraint_names` (["time", "weight", "stamina", "survival", "slots"]).
Column naming convention (set by Part 1): constraint i (1-based) owns the column s<i> (slack, <=),
e<i> (surplus, >=) and/or a<i> (artificial, = and >=). The row `zrow["c"]` holds z_j - c_j.
"""

from __future__ import annotations
import math

DEFAULT_RHS = {
    "time": 50.0,
    "weight": 40.0,
    "stamina": 90.0,
    "survival": 30.0,
    "slots": 14.0,
}


def _identify_column_for_constraint(i_1based: int, columns: list[str]) -> str | None:
    """Find column name for constraint i (slack s<i>, artificial a<i>, or surplus e<i>)."""
    s_col = f"s{i_1based}"
    if s_col in columns:
        return s_col
    a_col = f"a{i_1based}"
    if a_col in columns:
        return a_col
    e_col = f"e{i_1based}"
    if e_col in columns:
        return e_col
    return None


def shadow_prices(final_step: dict, constraint_names: list[str]) -> dict[str, float]:
    """Return {constraint_name: price}.
    
    Expected for 50-min demo: time 0.75, weight 0.5, slots 4.25, stamina 0.0, survival 0.0.
    """
    columns: list[str] = final_step["columns"]
    zrow_c: list[float] = final_step["zrow"]["c"]

    prices = {}
    for i, name in enumerate(constraint_names, start=1):
        col_name = _identify_column_for_constraint(i, columns)
        if col_name and col_name in columns:
            idx = columns.index(col_name)
            val = zrow_c[idx]
            price = round(val, 4) if abs(val) > 1e-6 else 0.0
            prices[name] = max(0.0, price)
        else:
            prices[name] = 0.0

    return prices


def rhs_ranging(final_step: dict, constraint_names: list[str], current_rhs: dict[str, float] | None = None) -> dict[str, tuple[float, float]]:
    """Return {constraint_name: (lowest_rhs, highest_rhs)} over which the shadow price stays valid.
    
    Feasibility condition for basis B with change Δb:
        x_B + Δb * d >= 0  ==>  Δb * d_i >= -x_{B,i}
    """
    columns: list[str] = final_step["columns"]
    basis: list[str] = final_step["basis"]
    tableau: list[list[float]] = final_step["tableau"]
    m_rows = len(basis)

    rhs_map = dict(current_rhs or DEFAULT_RHS)
    ranges = {}

    for i, name in enumerate(constraint_names, start=1):
        b_k = rhs_map.get(name, 0.0)
        s_col = f"s{i}"
        e_col = f"e{i}"

        # If slack or surplus is currently in basis, constraint has surplus slack
        if s_col in basis:
            row_idx = basis.index(s_col)
            slack_val = tableau[row_idx][-1]
            ranges[name] = (round(b_k - slack_val, 2), float("inf"))
            continue
        elif e_col in basis:
            row_idx = basis.index(e_col)
            surplus_val = tableau[row_idx][-1]
            ranges[name] = (float("-inf"), round(b_k + surplus_val, 2))
            continue

        # Binding constraint: read column of B^{-1} from slack or artificial column
        col_name = _identify_column_for_constraint(i, columns)
        if not col_name:
            ranges[name] = (b_k, b_k)
            continue

        c_idx = columns.index(col_name)
        min_delta = float("-inf")
        max_delta = float("inf")

        for r in range(m_rows):
            d_r = tableau[r][c_idx]
            x_r = tableau[r][-1]

            if d_r > 1e-9:
                min_delta = max(min_delta, -x_r / d_r)
            elif d_r < -1e-9:
                max_delta = min(max_delta, -x_r / d_r)

        lower = round(b_k + min_delta, 2) if min_delta != float("-inf") else float("-inf")
        upper = round(b_k + max_delta, 2) if max_delta != float("inf") else float("inf")
        ranges[name] = (lower, upper)

    return ranges


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
