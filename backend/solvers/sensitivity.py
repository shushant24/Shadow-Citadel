"""Part 2: Shadow prices from the final tableau, RHS ranging, bottleneck explanation.

Both functions read a *final* craft step (the last item of `steps`, see docs/api-contract.md) and the
answer's `constraint_names` (["time", "weight", "stamina", "survival", "slots"]).
Column naming convention (set by Part 1): constraint i (1-based) owns the column s<i> (slack, <=),
e<i> (surplus, >=) and/or a<i> (artificial, = and >=). The row `zrow["c"]` holds z_j - c_j.
"""


def shadow_prices(final_step, constraint_names):
    """Return {constraint_name: price}. Expected for the 50-minute case: time 0.75, weight 0.5, slots 4.25, others 0."""
    raise NotImplementedError("Part 2")


def rhs_ranging(final_step, constraint_names):
    """Return {constraint_name: (lowest_rhs, highest_rhs)} over which the shadow price stays valid."""
    raise NotImplementedError("Part 2")


def bottleneck_text(shadow_prices_by_constraint):
    """One readable sentence naming the constraint with the largest per-unit effect (craft time in the demo)."""
    raise NotImplementedError("Part 2")
