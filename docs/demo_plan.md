# Shadow Citadel Raid Optimizer: Demo Plan

CS2105 Optimization Techniques · Option 2 (RPG / Battle Royale Raid Score Optimizer)

> Repo creation and tooling installation are **not** assigned to anyone. Work is divided into 10 parts: **5 backend (solvers + API)** and **5 frontend (web app)**. The dataset, API contract and mock fixtures in Sections 3 and 6 are the starting point for everyone, so frontend and backend can work in parallel.

---

## 1. Problem statement

A player enters a map called **Shadow Citadel** from a base camp. The raid has a fixed limit of **120 minutes**. The player must:

1. Understand the safe territory of the map.
2. Collect all high-value checkpoints and return to base as fast as possible.
3. Decide which weapon to use against which boss.
4. Spend the time that is left on crafting consumables that give a bonus score, while meeting a minimum survival requirement and inventory limits.

**Goal:** maximize total raid score = boss-combat score + crafting bonus score, and show with numbers that optimized decisions beat naive ones.

**Why it is not a trivial single LP:** the output of one stage feeds the next. A longer route leaves less crafting time, which lowers the bonus score and can even make the crafting plan infeasible.

## 2. Syllabus mapping

| Stage | Question answered | Technique |
|---|---|---|
| 1 | Where is the safe boundary of the map? | Convex hull |
| 2 | What is the fastest tour through all checkpoints? | TSP: Hungarian method + subtour branching|
| 3 | Which weapon goes to which boss? | Assignment: Hungarian method (maximization form, unbalanced handling) |
| 4 | How to use the remaining time for crafting? | LPP: Simplex with Big-M / Two-Phase, plus shadow prices |

Not used in the core: transportation (NWCR / LCM / VAM, MODI). See the optional Stage 5 in Section 4.

## 3. Sample dataset (fixed, so results are reproducible)

Every solver must reproduce the expected results in Section 4. These numbers were cross-checked with an independent solver. Use such a solver only as a test oracle, not inside the project.

### 3.1 Map coordinates

| Node | Base | C1 | C2 | C3 | C4 | C5 | C6 | C7 |
|---|---|---|---|---|---|---|---|---|
| (x, y) | (0,0) | (15,18) | (19,5) | (7,14) | (9,11) | (2,9) | (5,20) | (2,5) |

Loot drops (used for the hull only):

| Loot | L1 | L2 | L3 | L4 |
|---|---|---|---|---|
| (x, y) | (23,12) | (12,23) | (5,16) | (16,4) |

### 3.2 Travel-time matrix (minutes, Euclidean distance rounded)

| | Base | C1 | C2 | C3 | C4 | C5 | C6 | C7 |
|---|---|---|---|---|---|---|---|---|
| **Base** | 0 | 23 | 20 | 16 | 14 | 9 | 21 | 5 |
| **C1** | 23 | 0 | 14 | 9 | 9 | 16 | 10 | 18 |
| **C2** | 20 | 14 | 0 | 15 | 12 | 17 | 21 | 17 |
| **C3** | 16 | 9 | 15 | 0 | 4 | 7 | 6 | 10 |
| **C4** | 14 | 9 | 12 | 4 | 0 | 7 | 10 | 9 |
| **C5** | 9 | 16 | 17 | 7 | 7 | 0 | 11 | 4 |
| **C6** | 21 | 10 | 21 | 6 | 10 | 11 | 0 | 15 |
| **C7** | 5 | 18 | 17 | 10 | 9 | 4 | 15 | 0 |

### 3.3 Weapon vs boss damage-score matrix (higher is better)

| | Boss 1 | Boss 2 | Boss 3 | Boss 4 | Boss 5 |
|---|---|---|---|---|---|
| **Weapon 1** | 82 | 64 | 97 | 43 | 96 |
| **Weapon 2** | 48 | 40 | 61 | 59 | 50 |
| **Weapon 3** | 83 | 97 | 81 | 50 | 61 |
| **Weapon 4** | 95 | 78 | 72 | 60 | 84 |
| **Weapon 5** | 69 | 79 | 54 | 96 | 66 |

### 3.4 Crafting recipes and limits

| Item | Score / unit | Craft time (min) | Weight (kg) | Stamina cost | Survival points |
|---|---|---|---|---|---|
| x1 Health potion | 8 | 3 | 3 | 4 | 5 |
| x2 Stamina potion | 6 | 4 | 2 | 1 | 2 |
| x3 Damage elixir | 10 | 5 | 4 | 5 | 0 |
| x4 Shield scroll | 7 | 3 | 1 | 3 | 3 |
| **Limit** | | ≤ 120 − tour time | ≤ 40 | ≤ 90 | ≥ 30 |

Exactly 14 inventory slots must be filled: `x1 + x2 + x3 + x4 = 14`.

### 3.5 Ready-to-use scenario file

```json
{
  "total_time": 120,
  "nodes": {"Base": [0,0], "C1": [15,18], "C2": [19,5], "C3": [7,14],
            "C4": [9,11], "C5": [2,9], "C6": [5,20], "C7": [2,5]},
  "loot": {"L1": [23,12], "L2": [12,23], "L3": [5,16], "L4": [16,4]},
  "weapon_boss_scores": [[82,64,97,43,96],[48,40,61,59,50],[83,97,81,50,61],
                         [95,78,72,60,84],[69,79,54,96,66]],
  "recipes": {"score": [8,6,10,7], "time": [3,4,5,3], "weight": [3,2,4,1],
              "stamina": [4,1,5,3], "survival": [5,2,0,3]},
  "limits": {"weight": 40, "stamina": 90, "survival_min": 30, "slots": 14}
}
```

---

## 4. Solution: the four-stage pipeline

### Stage 1: Convex hull (safe territory)

- **Input:** the 12 points (8 nodes + 4 loot drops).
- **Method:** Jarvis march or Graham scan, implemented by hand.
- **Use in the game:** the hull boundary is drawn as the safe zone.
- **Expected result:** 7 hull vertices in order: (0,0), (16,4), (19,5), (23,12), (12,23), (5,20), (2,9). The other 5 points are interior.

### Stage 2: Fastest tour (TSP)

- **Input:** the 8×8 time matrix with the diagonal set to a large value M.
- **Method:** solve the assignment relaxation with the Hungarian method. If the result contains subtours, branch by forbidding an arc of a subtour (set its cost to ∞), re-solve, and keep the best full tour.
- **Expected result:**
  - First Hungarian solution has cost **64** but contains two subtours: Base→C7→C5→Base and C1→C6→C3→C4→C2→C1. This is the visual proof that the relaxation alone is not enough.
  - After branching, the optimal tour is **Base→C2→C1→C6→C3→C4→C5→C7→Base = 70 minutes**.
  - Nearest neighbour (Base→C7→C5→C3→C4→C1→C6→C2→Base) costs **80 minutes**, so the optimized tour is 12.5% faster.

### Stage 3: Weapon-to-boss assignment

- **Input:** the 5×5 matrix in Section 3.3.
- **Method:** convert maximization to minimization with `c_ij = P_max − p_ij` (here P_max = 97), then row reduction, column reduction and the line-covering step. Support unbalanced cases (for example 5 weapons and 4 bosses) with a dummy row or column of zeros.
- **Expected result:** Weapon 1→Boss 5 (96), Weapon 2→Boss 3 (61), Weapon 3→Boss 2 (97), Weapon 4→Boss 1 (95), Weapon 5→Boss 4 (96). Total **445**.
- A greedy policy (each weapon takes its best remaining boss, in order) gets 414, so the optimized assignment is 7.5% better.

### Stage 4: Crafting plan (LPP)

Time left for crafting = 120 − tour time = **120 − 70 = 50 minutes**. This is where Stage 2 feeds Stage 4.

```
Maximize  Z = 8x1 + 6x2 + 10x3 + 7x4

subject to
  3x1 + 4x2 + 5x3 + 3x4 ≤ 50     (craft time)
  3x1 + 2x2 + 4x3 + 1x4 ≤ 40     (weight)
  4x1 + 1x2 + 5x3 + 3x4 ≤ 90     (stamina)
  5x1 + 2x2 + 0x3 + 3x4 ≥ 30     (minimum survival)
   x1 +  x2 +  x3 +  x4 = 14     (inventory slots)
  x1, x2, x3, x4 ≥ 0
```

The ≥ and = constraints need artificial variables, so this is exactly where Big-M (or Two-Phase) is required. The tableau should show every iteration.

- **Expected result:** x = (7, 0, 4, 3), **Z = 117**.
- **Shadow prices:** craft time 0.75 per extra minute, weight 0.50 per extra kg, inventory slot 4.25 per extra slot. Stamina and survival are not binding (shadow price 0), so relaxing them gives nothing. The bottleneck is craft time.
- **Chaining check:** with the naive 80-minute tour only 40 minutes remain and the 14-slot plan is **infeasible**. With 42 minutes the score is 111, with 50 minutes it is 117.

**Total score for the demo scenario = 445 (combat) + 117 (crafting) = 562.**

### Optional Stage 5: Supply distribution (transportation)

To cover NWCR / LCM / VAM and MODI as well, add a pre-raid stage where three supply depots ship crafting ingredients to raid camps at minimum cost (VAM first, then MODI, including an unbalanced case). Do this only if the core four stages are finished early. It would need one more backend endpoint and one more frontend tab.

---

## 5. Experiments to report (naive vs optimized)

| Module | Naive policy | Optimized | Reported gain |
|---|---|---|---|
| Route | Nearest neighbour: 80 min | Hungarian + branching: 70 min | 12.5% less time |
| Assignment | Greedy: 414 | Hungarian: 445 | 7.5% more score |
| Crafting | Equal split of items, adjusted until feasible (team computes) | Simplex / Big-M: 117 | Team reports the gap |
| Whole pipeline | Naive route makes crafting infeasible | Optimized route: total 562 | Shows stage dependency |

Also run 20 seeded random maps (8 to 10 nodes) and report average gain and solver time, so the claims do not rest on one example.

---

## 6. Architecture and interface contract

```
React frontend  <--- JSON over HTTP --->  Python backend (FastAPI or Flask)
(5 tabs)                                  (custom solvers, no linprog)
```

**Stack:** frontend in React + Vite (charts with Recharts or similar, map drawn with SVG or canvas). Backend in Python with hand-written solver classes. If your team prefers Streamlit, the same contract still works, but you lose the separation of frontend and backend parts.

### 6.1 Result envelope (every endpoint returns this)

```json
{
  "status": "optimal" | "infeasible" | "unbounded",
  "answer": { },
  "steps": [ { } ]
}
```

`steps` is an ordered list of intermediate states the frontend can replay with a Back / Next / Play control.

### 6.2 Endpoints

| Method and path | Request body | `answer` | One `steps` item |
|---|---|---|---|
| `GET /api/scenario` | none | the scenario file from 3.5 | none |
| `POST /api/hull` | `{"points": {"name": [x,y]}}` | `{"vertices": ["Base","L4",...], "interior": [...]}` | `{"action": "push"/"pop"/"skip", "point": "L4", "stack": ["Base","L4"]}` |
| `POST /api/route` | `{"matrix": [[...]], "labels": [...]}` | `{"tour": ["Base","C2",...], "cost": 70, "relaxation_cost": 64, "first_subtours": [[...],[...]]}` | one branch-and-bound node: `{"node": 3, "forbidden_arcs": [["C7","Base"]], "assignment": [...], "cost": 64, "subtours": [[...]], "status": "branch"/"pruned"/"feasible"}` |
| `POST /api/assign` | `{"scores": [[...]], "maximize": true}` | `{"pairs": [[1,5],[2,3],...], "total": 445}` | `{"phase": "convert"/"row_reduce"/"col_reduce"/"cover"/"adjust"/"final", "matrix": [[...]], "covered_rows": [], "covered_cols": []}` |
| `POST /api/craft` | `{"time_limit": 50, "recipes": {...}, "limits": {...}, "method": "bigm"/"twophase"}` | `{"x": [7,0,4,3], "z": 117, "shadow_prices": {"time": 0.75, "weight": 0.5, "slots": 4.25}, "binding": ["time","weight","slots"]}` | `{"iteration": 2, "basis": ["x1","x3","x4","s2","s3"], "tableau": [[...]], "entering": "x3", "leaving": "s1", "z": 112}` |
| `POST /api/pipeline` | the scenario | `{"tour_time": 70, "craft_time": 50, "combat": 445, "crafting": 117, "total": 562}` | none |
| `GET /api/experiments` | none | table of naive vs optimized per module and the 20-map summary | none |

### 6.3 Mock fixtures (so nobody waits)

Every frontend owner creates a `fixtures/<name>.json` file for their tab using the expected values in Section 4 and the formats above. The frontend runs on fixtures until the real endpoint is ready, then only the base URL changes. Backend owners validate their output against the same fixtures.

### 6.4 Frontend tabs

| Tab | Content |
|---|---|
| Map | Interactive 2D map: points, hull polygon, tour arrows, subtour overlay, optimal vs nearest-neighbour toggle, draggable points |
| Matchups | Editable 5×5 grid, step player for row/column reduction and line covering, highlighted final assignment, unbalanced toggle |
| Loadout | Inputs and sliders for limits, method switch (Big-M / Two-Phase), tableau stepper with pivot highlighted, shadow price chart, infeasibility message |
| Summary | Naive vs optimized charts, total score card, 20-map results, export for report screenshots |

---

## 7. Dividing the work into 10 parts

### 7.1 Backend (parts 1 to 5)

| # | Part | What you build | Deliverable | Done when | Pair with |
|---|---|---|---|---|---|
| 1 | Simplex, Big-M and Two-Phase engine | Tableau class, pivot rules, Bland's rule fallback, surplus and artificial variables, both Big-M and Two-Phase modes, infeasible and unbounded detection, per-iteration `steps` | `simplex.py`, `bigm.py`, `twophase.py` | Crafting LP gives Z = 117, x = (7,0,4,3); 40-minute case returns `infeasible` | 2, 9 |
| 2 | Sensitivity and crafting service | Shadow prices from the final tableau, right-hand-side ranging, bottleneck explanation text, `/api/craft` endpoint that builds the LP from the scenario and time limit | `sensitivity.py`, `api_craft.py` | Returns 0.75 / 0.50 / 4.25 and flags craft time; 42-minute case gives 111 | 1, 9 |
| 3 | Hungarian engine and assignment service | Row and column reduction, line covering, maximization conversion, dummy rows and columns for unbalanced input, `steps` per phase, `/api/assign` endpoint | `hungarian.py`, `api_assign.py` | Matchup gives 445; unbalanced example works | 4, 8 |
| 4 | TSP solver and route service | Cost-matrix preparation, call Hungarian, subtour detection, arc-forbidding branches, best-tour tracking, one `steps` item per B&B node, `/api/route` endpoint | `tsp.py`, `api_route.py` | First pass 64 with two subtours; final tour 70 | 3, 6 |
| 5 | Convex hull, geometry and pipeline API | Jarvis or Graham scan with `steps`, distance-matrix builder, seeded map generator, `/api/hull`, `/api/scenario`, `/api/pipeline` (chains tour time into craft time and totals the score), app wiring and CORS | `hull.py`, `geometry.py`, `pipeline.py`, `app.py` | 7 hull vertices; matrix equals 3.2; pipeline returns total 562 | 6, 10 |

### 7.2 Frontend (parts 6 to 10)

| # | Part | What you build | Deliverable | Done when | Pair with |
|---|---|---|---|---|---|
| 6 | App shell and shared components | Layout and tab navigation, API client with loading and error states, scenario editor panel, **reusable step player** (Back / Next / Play / speed) used by all tabs, theme, shared types | `App`, `api.js`, `StepPlayer`, `ScenarioPanel` | Any tab can plug in a step list and get a working player; editing the scenario updates every tab | 5, all frontend |
| 7 | Map tab | SVG or canvas map, point markers with labels, hull polygon, tour arrows, subtour overlay from the first Hungarian pass, optimal vs nearest-neighbour toggle, drag a point and re-run | `MapTab`, `fixtures/route.json`, `fixtures/hull.json` | Shows hull and 70-minute tour; toggle shows the 80-minute route; dragging recomputes | 4, 5 |
| 8 | Matchups tab | Editable 5×5 score grid, conversion view (`P_max − p_ij`), step player for row reduction, column reduction and line covering, highlighted final pairs and total, unbalanced toggle | `MatchupsTab`, `fixtures/assign.json` | Steps replay correctly and end at 445 | 3, 6 |
| 9 | Loadout tab | Inputs and sliders for time, weight, stamina, survival and slots, method switch, **tableau stepper** with entering and leaving variables highlighted, optimal plan display, shadow price bar chart, readable infeasibility message | `LoadoutTab`, `fixtures/craft.json` | Changing a slider updates the plan; 40-minute case shows a clear infeasible message | 1, 2 |
| 10 | Summary tab, baselines and experiments | Naive baselines (nearest neighbour, greedy, equal split) and the 20-map experiment in Python, `/api/experiments`, Summary tab with comparison charts, total score card, screenshot-friendly export view, end-to-end test against Section 4 | `baselines.py`, `experiments.py`, `SummaryTab`, `tests/test_e2e.py` | All Section 4 values pass; charts show 12.5%, 7.5% and the pipeline total | all |

### 7.3 Working rules

- Everyone follows the envelope and endpoint formats in Section 6. Changing a format needs agreement from the paired owners.
- Backend owners write at least 3 unit tests for their own solver. Frontend owners write at least 2 component tests (renders from fixture, handles error state).
- Pull requests get one review from a paired member.
- Every member writes their own report section (theory or UI design, formulation, screenshots). Slides are assembled together in the last phase.

---

## 8. Timeline (5 phases, adjust to your deadline)

| Phase | Backend | Frontend | Done when |
|---|---|---|---|
| 1 | Core solvers: simplex (1), Hungarian (3), hull (5) | Fixtures for every tab, shell and step player (6), tab skeletons on fixtures (7, 8, 9) | Hull and assignment match Section 4; every tab renders from fixtures |
| 2 | Big-M / Two-Phase (1), TSP (4), sensitivity (2), endpoints (2 to 5) | Tabs polished on fixtures; baselines (10) | Tour = 70, Z = 117, shadow prices match; all endpoints reachable |
| 3 | Pipeline chaining (5), fix contract mismatches | Switch tabs from fixtures to live API | All four tabs show live results |
| 4 | Edge cases: unbalanced, infeasible, degenerate | Error states, drag-to-recompute, Summary tab and 20-map results (10) | 20-map results table ready |
| 5 | Bug fixing | Screenshots for report, UI polish | Slides done and two full demo rehearsals run without errors |

## 9. Risks and checks

| Risk | Mitigation |
|---|---|
|
| Frontend blocked waiting for backend | Fixtures from Section 6.3 let every tab be built and demoed without the live API. |
| Backend and frontend disagree on JSON shape | The contract in Section 6 is the single source of truth; paired owners agree before changing it. |
| Degenerate or cycling tableaus | Bland's rule fallback and a unit test for it (Part 1). |
| Rounded distances cause ties in TSP | Keep the integer matrix from Section 3.2 for the demo; use raw floats only in random experiments. |
| Live demo fails (network, server) | Keep fixtures as an offline fallback and run the backend locally. |
| Part 6 and 10 become bottlenecks | They touch every tab, so start them first and reassign work at phase boundaries if needed. |
