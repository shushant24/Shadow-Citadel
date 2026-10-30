# API contract (demo plan Section 6, revised)

Single source of truth for backend and frontend. It is enforced in three places that must change **together**:

1. this document,
2. `backend/contract.py` (the executable version; `pytest tests/test_contract_shapes.py` checks every fixture against it, and every endpoint test checks live responses against it),
3. the shared fixtures in `fixtures/`.

## Result envelope
Every endpoint except `GET /api/scenario` returns

```json
{ "status": "optimal" | "infeasible" | "unbounded", "answer": {}, "steps": [{}] }
```

- `steps` is an ordered list of intermediate states the frontend replays with Back / Next / Play.
- **Infeasible and unbounded results are normal answers**: HTTP 200, `status` set accordingly, and `answer.message` holding one readable sentence the UI shows as-is (the shared `Status` component does this). Steps may still be present (the tableau that ended in infeasibility).
- Bad requests: HTTP 422 with FastAPI's `{"detail": ...}`. Endpoint not built yet: HTTP 501 with `{"detail": "Part N not implemented yet: ..."}`.

## Index and naming conventions
| Where | Convention |
|---|---|
| `/api/assign`: `pairs`, `selected`, `covered_rows`, `covered_cols`, `dummy_rows`, `dummy_cols`, `unassigned` | **1-based** (Weapon 1, Boss 1). Subtract 1 when indexing arrays in JS. |
| `/api/craft`: `pivot` | **0-based** `[row, col]` into `tableau` / `columns` (it indexes arrays directly). |
| hull / route | node **labels** (`"Base"`, `"C1"`, ...), never indices. |
| craft variables | decision `x1..x4`; per constraint `i` (1-based, order time, weight, stamina, survival, slots): slack `s<i>` (for <=), surplus `e<i>` (for >=), artificial `a<i>` (for >= and =). Demo columns: `x1 x2 x3 x4 s1 s2 s3 e4 a4 a5`. |

## Endpoints
| Method and path | Request body | `answer` | One `steps` item |
|---|---|---|---|
| `GET /api/scenario` | none | scenario file (`data/scenario.json`) | none |
| `POST /api/hull` | `{"points": {"name": [x,y]}}` | `vertices`, `interior` | `action`, `point`, `stack` |
| `POST /api/route` | `{"matrix", "labels"}` **or** `{"points": {...}}` | `tour`, `cost`, `relaxation_cost`, `first_subtours`, `nearest_neighbour` | one B&B node (below) |
| `POST /api/assign` | `{"scores": [[...]], "maximize": true}` | `pairs`, `total`, `unassigned` | one phase (below) |
| `POST /api/craft` | `{"time_limit", "recipes", "limits", "method"}` | `x`, `z`, `shadow_prices`, `binding`, `method`, `constraint_names`, `bottleneck` | one tableau (below) |
| `POST /api/pipeline?route=optimal\|nearest_neighbour` | the scenario | `tour_time`, `craft_time`, `combat`, `crafting`, `total`, `route_policy`, `tour` | none |
| `GET /api/experiments` | none | `modules`, `random_maps` | none |

### `/api/hull`
Step: `{"action": "push"|"pop"|"skip", "point": "L4", "stack": ["Base","L4"]}`. The last step's `stack` equals `vertices` (counter-clockwise, starting at Base). Graham scan emits push/pop; Jarvis march may emit only push/skip. `interior` = every point that is not a vertex.

### `/api/route`
- Request, either form. `{"points": {"Base": [0,0], ...}}` builds the matrix on the server (rounded Euclidean) with labels = key order and the first key as depot; this is what drag-to-recompute uses, so the frontend never re-implements distance maths.
- `answer.nearest_neighbour = {"tour", "cost"}` (80 on the demo) feeds the Map tab's optimal vs nearest-neighbour toggle.
- Step (one per solved B&B node, in solve order):

```json
{"node": 3, "parent": 2,
 "forbidden_arcs": [["Base","C7"],["Base","C5"]], "branched_arc": ["Base","C5"],
 "assignment": [["Base","C4"],["C1","C2"],["C2","C1"],["C3","C6"],["C4","C5"],["C5","C7"],["C6","C3"],["C7","Base"]],
 "cost": 70, "subtours": [["Base","C4","C5","C7"],["C1","C2"],["C3","C6"]],
 "status": "branch", "incumbent": null, "note": "branch on arcs of the smallest subtour: C1->C2, C2->C1"}
```
`parent` is `null` only for node 1. `branched_arc` is the arc forbidden at this node (last entry of `forbidden_arcs`), `null` for the root. `cost` is `null` when every assignment uses a forbidden arc. `incumbent` is the best full-tour cost known after this node. `subtours` is empty for a feasible node. The reference trace (`fixtures/route.json`, 23 nodes) is described in `docs/decisions.md`.

### `/api/assign`
- `answer`: `pairs` (dummy pairs left out), `total` (computed on the **original** scores), `unassigned: {"rows": [], "cols": []}` (an original row or column that was matched to a dummy).
- Step phases, in order: `convert`, `row_reduce`, `col_reduce`, then `cover` (and `adjust` followed by another `cover`) repeated until n lines cover all zeros, then `final`. Every step has the full current `matrix` (padded to square), `covered_rows`, `covered_cols`, `dummy_rows`, `dummy_cols`, `note`. `adjust` adds `delta`; `final` adds `selected` (the chosen zeros, dummies included).
- `maximize: false` skips the `c_ij = P_max - p_ij` conversion (the `convert` step then only pads).
- Fixtures: `assign.json` (445), `assign_unbalanced.json` (5 weapons x 4 bosses, total 385), `assign_adjust.json` (4x4 that needs an adjust step; carries its own `input`).

### `/api/craft`
Request `time_limit` = minutes left for crafting; `recipes` and `limits` as in `data/scenario.json`; `method` `"bigm"` (default) or `"twophase"`.

Answer (optimal): `x`, `z`, `shadow_prices` (at least `time`, `weight`, `slots`; stamina and survival may be included as 0), `binding` (names with a non-zero price), `method`, `constraint_names` (`["time","weight","stamina","survival","slots"]`), `bottleneck` (one sentence). Infeasible: `answer.message` plus `method` and `constraint_names`.

Step (one per tableau: iteration 0 = initial, one per pivot, last = final):

```json
{"iteration": 0, "phase": "bigm",
 "columns": ["x1","x2","x3","x4","s1","s2","s3","e4","a4","a5"],
 "basis":   ["s1","s2","s3","a4","a5"],
 "tableau": [[3,4,5,3,1,0,0,0,0,0,50], "...one row per basic variable, last entry = RHS..."],
 "zrow": {"c": [-8,-6,-10,-7,0,0,0,0,0,0,0], "m": [-6,-3,-1,-4,0,0,0,1,0,0,-44]},
 "entering": "x1", "leaving": "a4", "pivot": [3,0], "z": 0, "z_m": -44, "note": "x1 enters, a4 leaves"}
```
(Real first step of `fixtures/craft.json`, tableau abbreviated. Column `x1` has `m = -6`, i.e. `-6M - 8`.)
- **Big-M is symbolic.** `zrow` holds `z_j - c_j` as `m*M + c`: `zrow.m` are the coefficients of M, `zrow.c` the constants. The UI prints e.g. `3M - 8`. Compare `(m, c)` lexicographically. `z` and `z_m` are the objective value's constant part and M coefficient. In Two-Phase `zrow.m` is all zeros.
- The last step has `pivot`, `leaving` = `null`. An unbounded LP ends with `entering` set and `pivot` = `null`.
- **Infeasible (Big-M):** the final tableau still has an artificial variable in the basis at a positive RHS. **(Two-Phase):** phase 1 ends with a positive objective. Part 9 shows `answer.message`.
- **Reading shadow prices from the final step** (what `solvers/sensitivity.py` implements): price of a `<=` constraint = `zrow.c` at its `s<i>` column; of an `=` constraint = `zrow.c` at its `a<i>` column; of a `>=` constraint = `-zrow.c` at its `e<i>` column. Two-Phase keeps the artificial columns (they may not re-enter) so the `slots` price is still readable. Demo values: time 0.75, weight 0.50, slots 4.25.
- Fixtures: `craft.json` (50 min, Big-M, 5 tableaux), `craft_twophase.json` (50 min, 8 tableaux), `craft_42.json` (z = 111), `craft_infeasible.json` (40 min).

### `/api/pipeline`
`craft_time = total_time - tour_time`. Query `route=optimal` (default) uses the Hungarian + branching tour; `route=nearest_neighbour` uses the naive tour, which leaves 40 minutes and makes crafting infeasible. In that case `status` is `"infeasible"`, `answer.message` explains it, `crafting` and `total` are `null`, `combat` is still 445. Fixtures: `pipeline.json`, `pipeline_naive.json`.

### `/api/experiments`
```json
{"status": "optimal",
 "answer": {"modules": [{"module": "Route", "naive": 80, "optimized": 70, "unit": "minutes",
                          "gain_pct": 12.5, "direction": "lower_is_better", "naive_note": "optional"}],
            "random_maps": {"n": 20, "avg_route_gain_pct": 0, "avg_assign_gain_pct": 0, "avg_solver_ms": 0,
                            "maps": [{"seed": 0, "n_nodes": 8}]}},
 "steps": []}
```
`random_maps` is `null` until Part 10 computes it; `naive` and `gain_pct` are `null` for Crafting and Whole pipeline until then (the whole-pipeline naive result is "infeasible", see `pipeline_naive.json`). Parts 9 and 10 owners may extend the per-map fields; update `contract.py`, the fixture and the test in the same PR.

## Fixture mode
`frontend/.env` with `VITE_USE_FIXTURES=true` (default) makes the API client answer from `fixtures/*.json`. Fixtures are **canned**: they cover the plan's cases (see `FIXTURE_LIMITS` in `frontend/src/api.js`), so sliders, edits and dragging do not recompute offline. For a live demo run the backend locally and set `VITE_USE_FIXTURES=false`; keep fixture mode as the fallback for the static parts.
