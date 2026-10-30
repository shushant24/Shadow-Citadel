# Decisions the plan leaves open (defaults, change by agreement)

Each item states the default the skeleton, fixtures and tests already assume. If a part needs something different, change it here and in the contract/fixtures in the same PR.

| # | Question | Default |
|---|---|---|
| 1 | **Integer or continuous crafting?** The project statement says continuous crafting; the plan's slot constraint looks like counting items. | Solve the **LP relaxation** (what the syllabus covers). The demo answers (7,0,4,3) and (13,0,0,1) happen to be integral, but other slider values can give fractions: show them as they are and label the plan "LP relaxation" in the UI and the report. No rounding, no branch and bound on the LP. |
| 2 | Big-M value | Keep **M symbolic** (`m*M + c`, see the contract). No numeric M, so there is nothing to tune and the tableau shows the textbook entries. |
| 3 | Simplex pivot rules | Entering: most negative `z_j - c_j` (lexicographic on `(m, c)`), ties to the lowest column. Leaving: minimum ratio, ties to the lowest basis row. Switch to Bland's rule after a streak of degenerate pivots (suggest 10). The skipped test in `test_part1_simplex.py` should use Beale's cycling example. |
| 4 | B&B scheme for the TSP | Depth-first; solve the assignment relaxation with forbidden arcs set to infinity (a constant larger than any tour cost, e.g. `10**9`); branch on the arcs of the **smallest subtour**, one child per arc (child *k* forbids arc *k*, keeps the parent's forbidden arcs); prune when `cost >= incumbent`; nodes numbered in solve order. `fixtures/route.json` is this scheme's full trace (23 nodes, optimum found at node 4, incumbent 70). Another scheme is fine if the step fields are filled in. |
| 5 | Optimal tour direction | The matrix is symmetric, so every optimal tour has a mirror twin of the same cost. Tests check cost, endpoints and visiting all nodes, never the direction. The frontend must not assert a direction in live mode. |
| 6 | Hull algorithm and degenerate points | Graham scan or Jarvis march. Collinear points on an edge are **not** vertices (they are listed as interior). Output starts at Base and goes counter-clockwise. |
| 7 | Floats in the random experiments | The demo uses the rounded integer matrix. Random maps use raw float distances; compare costs with a tolerance of `1e-9`. Tie-breaking in the Hungarian method must be deterministic (lowest index first) so seeded runs repeat. |
| 8 | Naive equal-split crafting (Part 10 to confirm) | Start from `x = (4, 4, 3, 3)`; while a `<=` constraint is violated move one unit from the item with the highest time per score to the one with the lowest; return `None` if 14 slots cannot be met. Report the gap to 117. |
| 9 | Unbalanced assignment | Pad with a dummy row/column of zeros (after the `P_max - p_ij` conversion); report the original row/column matched to a dummy in `unassigned`. |
| 10 | Hull is visual only | The hull does not feed the other stages (as in the plan). The Map tab draws it as the safe zone; nothing is filtered by it. |
