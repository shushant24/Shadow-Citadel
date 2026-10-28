# API contract (demo plan Section 6)

Single source of truth for backend and frontend. The shared fixtures in `fixtures/` follow it exactly; backend tests and the frontend both read those files.

## Result envelope
Every endpoint except `GET /api/scenario` returns:

```json
{ "status": "optimal" | "infeasible" | "unbounded", "answer": {}, "steps": [{}] }
```

`steps` is an ordered list of intermediate states the frontend replays with Back / Next / Play.

## Endpoints

| Method and path | Request body | `answer` | One `steps` item |
|---|---|---|---|
| `GET /api/scenario` | none | scenario file (`data/scenario.json`) | none |
| `POST /api/hull` | `{"points": {"name": [x,y]}}` | `{"vertices": [...], "interior": [...]}` | `{"action": "push"/"pop"/"skip", "point": "L4", "stack": [...]}` |
| `POST /api/route` | `{"matrix": [[...]], "labels": [...]}` | `{"tour": [...], "cost": 70, "relaxation_cost": 64, "first_subtours": [[...],[...]]}` | `{"node": 3, "forbidden_arcs": [["C7","Base"]], "assignment": [...], "cost": 64, "subtours": [[...]], "status": "branch"/"pruned"/"feasible"}` |
| `POST /api/assign` | `{"scores": [[...]], "maximize": true}` | `{"pairs": [[1,5],...], "total": 445}` | `{"phase": "convert"/"row_reduce"/"col_reduce"/"cover"/"adjust"/"final", "matrix": [[...]], "covered_rows": [], "covered_cols": []}` |
| `POST /api/craft` | `{"time_limit": 50, "recipes": {...}, "limits": {...}, "method": "bigm"/"twophase"}` | `{"x": [7,0,4,3], "z": 117, "shadow_prices": {"time": 0.75, "weight": 0.5, "slots": 4.25}, "binding": ["time","weight","slots"]}` | `{"iteration": 2, "basis": [...], "tableau": [[...]], "entering": "x3", "leaving": "s1", "z": 112}` |
| `POST /api/pipeline` | the scenario | `{"tour_time": 70, "craft_time": 50, "combat": 445, "crafting": 117, "total": 562}` | none |
| `GET /api/experiments` | none | see below | none |

Notes on the fixtures:
- `fixtures/route.json` additionally carries `answer.nearest_neighbour = {"tour", "cost"}` so the Map tab can toggle optimal vs nearest-neighbour. This is an addition to the plan's contract; Part 4 should return it too.
- The `/api/craft` and `/api/route` fixtures contain only the steps the plan lets us verify (see each file's `_fixture_note`). Real traces replace them when Parts 1 and 4 land.
- `fixtures/craft_infeasible.json` is the 40-minute case.

## `/api/experiments` shape (PROPOSED, the plan does not define it)
```json
{
  "status": "optimal",
  "answer": {
    "modules": [{"module": "Route", "naive": 80, "optimized": 70, "unit": "minutes", "gain_pct": 12.5, "direction": "lower_is_better"}],
    "random_maps": {"n": 20, "avg_route_gain_pct": 0, "avg_assign_gain_pct": 0, "avg_solver_ms": 0, "maps": [{"seed": 0, "n_nodes": 8}]}
  },
  "steps": []
}
```
`naive` for Crafting and Whole pipeline is `null` until the team computes it (equal-split policy). Parts 9 and 10 owners: agree or amend, then update `fixtures/experiments.json` and `backend/tests/test_part10_baselines_experiments.py`.

## Fixture notes
The plan says the frontend runs on fixtures until the backend is ready. Toggle with `VITE_USE_FIXTURES` in `frontend/.env` (copy `.env.example`). Keep fixture mode working: it is the offline fallback for the live demo.
