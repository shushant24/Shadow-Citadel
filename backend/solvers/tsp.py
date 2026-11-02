"""Part 4: TSP via assignment relaxation (Hungarian) plus subtour-arc branching.
One steps item per B&B node.

Method
------
TSP = assignment problem + "the chosen arcs form ONE cycle".
1. Solve the assignment relaxation (diagonal = M so nobody is matched to itself).
   Its optimum is a LOWER BOUND on every tour, because a tour is also an assignment.
2. A single cycle through all nodes is a tour -> candidate (incumbent).
3. Otherwise the assignment splits into subtours. Take the smallest one, with arcs
   a_1..a_k. A tour cannot contain ALL arcs of a proper sub-cycle, so every tour
   misses at least one a_i. Child i forbids a_i (its cost becomes M). The children
   cover every tour, so no optimal tour is lost.
4. Prune a node when its bound >= the incumbent (cannot improve) or when it is
   infeasible (bound >= M: it must use a forbidden arc).

Search order: depth-first, children in the cyclic order of the smallest subtour's
arcs (the scheme described in the repo's reference trace).

M = n * max_cost + 1: a valid assignment costs <= n * max_cost, any assignment that
uses a forbidden arc costs >= M, so the two can never be confused.

Dependencies: standard library only.
"""

_EPS = 1e-9


# ---------------------------------------------------------------------------
# Assignment solver. Default is a built-in O(n^3) Hungarian (min cost). To use the
# Part 3 engine instead, pass assign_fn: it takes an n x n cost matrix and returns,
# for each row i, the column matched to it.
# ---------------------------------------------------------------------------
def _hungarian_min(cost):
    n = len(cost)
    inf = float("inf")
    u = [0.0] * (n + 1)
    v = [0.0] * (n + 1)
    p = [0] * (n + 1)
    way = [0] * (n + 1)
    for i in range(1, n + 1):
        p[0] = i
        j0 = 0
        minv = [inf] * (n + 1)
        used = [False] * (n + 1)
        while True:
            used[j0] = True
            i0, delta, j1 = p[j0], inf, 0
            for j in range(1, n + 1):
                if not used[j]:
                    cur = cost[i0 - 1][j - 1] - u[i0] - v[j]
                    if cur < minv[j]:
                        minv[j], way[j] = cur, j0
                    if minv[j] < delta:
                        delta, j1 = minv[j], j
            for j in range(n + 1):
                if used[j]:
                    u[p[j]] += delta
                    v[j] -= delta
                else:
                    minv[j] -= delta
            j0 = j1
            if p[j0] == 0:
                break
        while True:
            j1 = way[j0]
            p[j0] = p[j1]
            j0 = j1
            if j0 == 0:
                break
    assignment = [0] * n
    for j in range(1, n + 1):
        assignment[p[j] - 1] = j - 1
    return assignment


def _find_subtours(assignment):
    """assignment[i] = j means arc i->j. Cycles as lists of node indices, each cycle
    starting at its smallest unvisited index, in order of that start."""
    seen = [False] * len(assignment)
    cycles = []
    for s in range(len(assignment)):
        if not seen[s]:
            cyc, i = [], s
            while not seen[i]:
                seen[i] = True
                cyc.append(i)
                i = assignment[i]
            cycles.append(cyc)
    return cycles


def _cycle_arcs(cyc):
    return [(cyc[k], cyc[(k + 1) % len(cyc)]) for k in range(len(cyc))]


def nearest_neighbour_tour(matrix, labels):
    """Greedy baseline starting at labels[0]: always go to the cheapest unvisited node."""
    from solvers.baselines import nearest_neighbour

    start = labels[0] if labels else "Base"
    res = nearest_neighbour(matrix, labels, start=start)
    return {"tour": res.tour, "cost": res.cost}


def solve_tsp(matrix, labels=None, assign_fn=None, nn_fn=None):
    """Return an envelope {"status", "answer", "steps"}.

    answer: tour (starts and ends at labels[0]), cost, relaxation_cost (root node),
            first_subtours, nearest_neighbour {"tour", "cost"}.
    steps:  one item per solved B&B node, in solve order, with fields node, parent,
            forbidden_arcs, branched_arc, assignment, cost (None if infeasible),
            subtours, status ("branch" / "pruned" / "feasible"), incumbent.
    """
    n = len(matrix)
    labels = list(labels) if labels is not None else [str(i) for i in range(n)]
    assign_fn = assign_fn or _hungarian_min
    nn = (nn_fn or nearest_neighbour_tour)(matrix, labels)

    big = n * max(matrix[i][j] for i in range(n) for j in range(n) if i != j) + 1
    base = [[big if i == j else matrix[i][j] for j in range(n)] for i in range(n)]

    steps = []
    incumbent, best_assignment = None, None
    root_cost, first_subtours = None, None
    # depth-first stack of (parent id, branched arc, forbidden arcs)
    stack = [(None, None, frozenset())]

    while stack:
        parent, branched, forbidden = stack.pop()
        node_id = len(steps) + 1

        work = [row[:] for row in base]
        for a, b in forbidden:
            work[a][b] = big
        assignment = assign_fn(work)
        cost = sum(work[i][assignment[i]] for i in range(n))
        feasible = cost < big
        subtours = _find_subtours(assignment) if feasible else []

        if node_id == 1:
            root_cost = cost if feasible else None
            first_subtours = [[labels[i] for i in c] for c in subtours]

        if not feasible or (incumbent is not None and cost >= incumbent - _EPS):
            status = "pruned"
        elif len(subtours) == 1:
            status = "feasible"
            incumbent, best_assignment = cost, assignment
        else:
            status = "branch"
            arcs = _cycle_arcs(min(subtours, key=len))
            for arc in reversed(arcs):          # so the first arc is explored first
                stack.append((node_id, arc, forbidden | {arc}))

        steps.append({
            "node": node_id,
            "parent": parent,
            "forbidden_arcs": [[labels[a], labels[b]] for a, b in sorted(forbidden)],
            "branched_arc": None if branched is None else [labels[branched[0]], labels[branched[1]]],
            "assignment": [[labels[i], labels[assignment[i]]] for i in range(n)] if feasible else None,
            "cost": cost if feasible else None,
            "subtours": [[labels[i] for i in c] for c in subtours],
            "status": status,
            "incumbent": incumbent,
        })

    if best_assignment is None:
        return {"status": "infeasible",
                "answer": {"tour": None, "cost": None, "relaxation_cost": root_cost,
                           "first_subtours": first_subtours, "nearest_neighbour": nn},
                "steps": steps}

    order, i = [0], best_assignment[0]
    while i != 0:
        order.append(i)
        i = best_assignment[i]
    order.append(0)
    return {"status": "optimal",
            "answer": {"tour": [labels[i] for i in order], "cost": incumbent,
                       "relaxation_cost": root_cost, "first_subtours": first_subtours,
                       "nearest_neighbour": nn},
            "steps": steps}
