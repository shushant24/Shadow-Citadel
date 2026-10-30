"""Part 1: Big-M mode: surplus and artificial variables."""


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
    raise NotImplementedError("Part 1")
