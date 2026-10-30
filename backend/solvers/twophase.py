"""Part 1: Two-Phase mode."""


def solve_twophase(c, A, b, senses, maximize=True):
    """Same inputs, naming and envelope as solve_bigm, with phase = "phase1" then "phase2".

    Phase 1 minimizes the sum of artificials; zrow["m"] is all zeros in both phases.
    Keep the artificial columns in the phase 2 tableau (they may not re-enter) so the price of an
    equality constraint (slots) can still be read from column a<i>. See fixtures/craft_twophase.json.
    Infeasible: phase 1 ends with a positive objective.
    """
    raise NotImplementedError("Part 1")
