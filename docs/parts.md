# The 10 parts (demo plan Section 7)

Fill in the **Owner** column. "Pair with" lists the review partners. Parts 6 and 10 touch every tab, so start them first.

## Backend

| # | Part | Owner | Files | Done when | Pair with |
|---|---|---|---|---|---|
| 1 | Simplex, Big-M and Two-Phase engine | | `backend/solvers/simplex.py`, `bigm.py`, `twophase.py` | Crafting LP gives Z = 117, x = (7,0,4,3); 40-minute case returns `infeasible` | 2, 9 |
| 2 | Sensitivity and crafting service | | `solvers/sensitivity.py`, `api/api_craft.py` | Shadow prices 0.75 / 0.50 / 4.25, craft time flagged; 42-minute case gives 111 | 1, 9 |
| 3 | Hungarian engine and assignment service | | `solvers/hungarian.py`, `api/api_assign.py` | Matchup gives 445; unbalanced example works | 4, 8 |
| 4 | TSP solver and route service | | `solvers/tsp.py`, `api/api_route.py` | First pass 64 with two subtours; final tour 70 | 3, 6 |
| 5 | Convex hull, geometry and pipeline API | | `solvers/hull.py`, `geometry.py`, `pipeline.py`, `app.py`, `api/api_geometry.py`, `api/api_pipeline.py` | 7 hull vertices; matrix equals 3.2; pipeline returns total 562 | 6, 10 |

## Frontend

| # | Part | Owner | Files | Done when | Pair with |
|---|---|---|---|---|---|
| 6 | App shell and shared components | | `frontend/src/App.jsx`, `api.js`, `components/StepPlayer.jsx`, `components/ScenarioPanel.jsx` | Any tab can plug in a step list and get a working player; editing the scenario updates every tab | 5, all frontend |
| 7 | Map tab | | `tabs/MapTab.jsx`, `fixtures/route.json`, `fixtures/hull.json` | Shows hull and 70-minute tour; toggle shows the 80-minute route; dragging recomputes | 4, 5 |
| 8 | Matchups tab | | `tabs/MatchupsTab.jsx`, `fixtures/assign.json` | Steps replay correctly and end at 445 | 3, 6 |
| 9 | Loadout tab | | `tabs/LoadoutTab.jsx`, `fixtures/craft.json` | Changing a slider updates the plan; 40-minute case shows a clear infeasible message | 1, 2 |
| 10 | Summary tab, baselines, experiments | | `solvers/baselines.py`, `experiments.py`, `api/api_experiments.py`, `tabs/SummaryTab.jsx`, `backend/tests/test_e2e.py` | All Section 4 values pass; charts show 12.5%, 7.5% and the pipeline total | all |

## Working rules
- Follow the envelope and endpoint formats in `docs/api-contract.md`. A format change needs agreement from the paired owners, and the fixtures must change in the same PR.
- Backend owners: at least 3 unit tests for their solver. Frontend owners: at least 2 component tests (renders from fixture, handles error state).
- One review per PR from a paired member.
- Each member writes their own report section (theory or UI design, formulation, screenshots).
