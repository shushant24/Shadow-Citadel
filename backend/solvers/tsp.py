"""Part 4: TSP via assignment relaxation (Hungarian) plus subtour-arc branching. One steps item per B&B node."""


def solve_tsp(matrix, labels):
    """Return an envelope.

    answer: tour (starts and ends at labels[0]), cost, relaxation_cost (root node), first_subtours,
            nearest_neighbour {"tour", "cost"} (baseline for the Map tab toggle; 80 on the demo matrix).
    steps:  one item per solved B&B node, in solve order, with fields
            node, parent (None for the root), forbidden_arcs, branched_arc (the arc forbidden at this node,
            None for the root), assignment, cost (None if the node is infeasible), subtours,
            status ("branch" / "pruned" / "feasible"), incumbent (best full-tour cost known after this node).
    The reference trace in fixtures/route.json uses: depth-first, branch on the arcs of the smallest subtour,
    one child per arc (each child forbids that arc), prune when cost >= incumbent. Other schemes are fine
    as long as the fields above are filled in (see docs/decisions.md).
    """
    raise NotImplementedError("Part 4")
