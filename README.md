# Shadow Citadel Raid Optimizer

CS2105 Optimization Techniques, Option 2 (RPG / Battle Royale raid score optimizer).

A player enters the **Shadow Citadel** from a base camp with a 120-minute raid limit. The app decides the safe boundary of the map, the fastest route through all checkpoints, which weapon fights which boss, and how to spend the remaining time on crafting. Every stage is solved by **hand-written operations research solvers** (no `linprog`, SciPy or PuLP in the project), and each solver exposes its intermediate steps so the web app can replay them.

**Demo scenario result: 445 combat + 117 crafting = 562**

| Stage | Question | Technique | Demo result |
|---|---|---|---|
| 1 | Where is the safe boundary? | Convex hull (Graham scan) | 7 hull vertices |
| 2 | What is the fastest tour? | TSP: Hungarian relaxation + subtour branching | First pass 64 (two subtours), optimal tour **70 min** (nearest neighbour 80) |
| 3 | Which weapon fights which boss? | Assignment: Hungarian method, maximization and unbalanced cases | **445** (greedy 414) |
| 4 | How to use the remaining time? | LP: Simplex with Big-M / Two-Phase, shadow prices | **117** with x = (7, 0, 4, 3) |

The stages are chained: a longer route leaves less crafting time. With the naive 80-minute route only 40 minutes remain and the 14-slot crafting plan is **infeasible**; the optimized 70-minute route leaves 50 minutes and gives the full 562.

## Features

- **Map tab:** interactive SVG map with hull polygon, tour arrows, subtour overlay from the first Hungarian pass, optimal vs nearest-neighbour toggle, branch-and-bound step player, and draggable points that recompute the hull and tour.
- **Matchups tab:** editable score grid (up to 8x8), conversion view (`P_max - p_ij`), step player for row reduction, column reduction and line covering, highlighted final pairs, unbalanced (5x4 and 4x5) cases, maximize or minimize mode.
- **Loadout tab:** crafting time slider and inputs for weight, stamina, survival and slots, Big-M / Two-Phase switch, simplex tableau stepper with entering, leaving and pivot highlighted, plan and resource meters, shadow-price chart, readable infeasibility message.
- **Summary tab:** total score card, naive vs optimized comparison for every stage, 20-seeded-random-map benchmark table with averages, and a print / copy-Markdown report export view.

## Tech stack

- **Backend:** Python, FastAPI, hand-written solvers
- **Frontend:** React + Vite, Vitest for tests, plain CSS (`theme.css`)
- **Tests:** pytest (backend), Vitest + Testing Library (frontend), ruff (lint)

## Run it on localhost

### Requirements

- Python 3.10 or newer
- Node.js 18 or newer, with npm

### 1. Install

From the project root. With `make` installed this is one command:

```
make setup
```

Without `make` (Windows PowerShell):

```powershell
cd backend
python -m venv .venv
.venv\Scripts\pip install -r requirements-dev.txt
cd ..\frontend
npm install
```

On macOS or Linux use `.venv/bin/pip` instead of `.venv\Scripts\pip`.

### 2. Start the backend (terminal 1)

```
make dev-backend
```

or, without `make`:

```powershell
cd backend
.venv\Scripts\uvicorn app:app --reload --port 8000
```

The API runs at http://localhost:8000.

- Interactive API docs: http://localhost:8000/docs
- Health check: http://localhost:8000/api/health
- The root URL `/` has no page, so `GET /` returns 404. That is normal.

### 3. Start the frontend (terminal 2)

```
make dev-frontend
```

or:

```powershell
cd frontend
npm run dev
```

Open http://localhost:5173.

### 4. Fixtures or the live backend

By default the frontend runs on **fixtures**: canned responses with real solver traces stored in `fixtures/`. This works with no backend, but sliders, grid edits, dragging and the scenario panel do not recompute.

To use the live backend:

```powershell
cd frontend
copy .env.example .env
```

On macOS or Linux: `cp .env.example .env`. Then edit `frontend/.env` and set:

```
VITE_USE_FIXTURES=false
```

Stop `npm run dev` (Ctrl+C) and start it again, because Vite reads `.env` only at startup. Keep the backend running.

### 5. Check that it works

| Tab | What you should see |
|---|---|
| Map | 7 hull vertices, optimal tour 70 min, nearest-neighbour toggle 80 min, dragging a point recomputes |
| Matchups | Total 445 (greedy 414); 5x4 gives 385 and 4x5 gives 349 |
| Loadout | 117 at 50 min (x = 7, 0, 4, 3), 111 at 42 min, infeasible at 40 min, shadow prices 0.75 / 0.50 / 4.25 |
| Summary | Total 562, gains of 12.5% (route), 7.5% (assignment) and 5.4% (crafting), 20-map table, report export |

### Troubleshooting

- **`404 Not Found` for `GET /` in the backend log:** expected. Use `/docs` or `/api/health`.
- **Frontend shows errors or never updates:** make sure the backend is running on port 8000, and restart `npm run dev` after editing `.env`.
- **CORS errors in the browser:** open the app at `http://localhost:5173` and keep the backend on port 8000.
- **`make` is not recognized on Windows:** use the manual commands above, or install `make` through Git Bash or Chocolatey.
- **npm audit warnings or an esbuild "allow-scripts" notice:** safe to ignore for local use. Do not run `npm audit fix --force`.

## API

Every endpoint returns the same envelope:

```json
{ "status": "optimal" | "infeasible" | "unbounded", "answer": { }, "steps": [ { } ] }
```

`steps` is an ordered list of intermediate states that the frontend replays with Back / Next / Play controls.

| Endpoint | Purpose |
|---|---|
| `GET /api/health` | Health check |
| `GET /api/scenario` | The demo scenario (nodes, loot, weapon-boss scores, recipes, limits) |
| `POST /api/hull` | Convex hull with push / pop steps |
| `POST /api/route` | TSP: tour, cost, first-pass relaxation cost and subtours, one step per branch-and-bound node |
| `POST /api/assign` | Hungarian assignment with one step per phase |
| `POST /api/craft` | Crafting LP (Big-M or Two-Phase): plan, Z, shadow prices, binding constraints, tableau per iteration |
| `POST /api/pipeline` | Chains tour time into crafting time and totals the score (optimal or nearest-neighbour route) |
| `GET /api/experiments` | Naive vs optimized per module plus the 20 seeded random maps |

Request and response shapes are specified in [`docs/api-contract.md`](docs/api-contract.md) and checked by tests.

## Project layout

```
backend/
  app.py            FastAPI app and routers
  api/              one router per endpoint
  solvers/          hand-written solvers: simplex, bigm, twophase, sensitivity,
                    hungarian, tsp, hull, geometry, baselines, pipeline, experiments
  contract.py       executable JSON contract
  tests/            pytest suite
frontend/
  src/
    tabs/           MapTab, MatchupsTab, LoadoutTab, SummaryTab (+ matchups/, loadout/, summary/)
    components/     StepPlayer, Status, ScenarioPanel
    api.js          API client with fixture mode
    theme.css       shared styles and design tokens
data/               scenario.json and time_matrix.json (expected oracle values)
fixtures/           canned responses with real traces; the frontend runs on them offline
docs/               plan, API contract, decisions, parts, report material
```

## Tests

```
make test
```

or run each side yourself:

```powershell
cd backend
.venv\Scripts\pytest -q

cd ..\frontend
npm test -- --run
npm run build
```

- Solver and endpoint tests check the demo values (hull, 64 first pass, tour 70, 445, Z = 117, 111 at 42 minutes, infeasible at 40, total 562).
- `test_contract_shapes.py` checks every fixture against `backend/contract.py` and replays the traces. Endpoint tests also validate their output with `check_contract(...)`, so a format change fails a test.
- `test_e2e.py` runs the Section 4 values end to end.
- `test_no_forbidden_imports.py` enforces the "no library solvers" rule: no SciPy, `linprog` or PuLP inside `solvers/` or `api/`. Such tools are allowed only as oracles in `tests/`.
- Lint the backend with `ruff check backend`.

## Experiments

The Summary tab and `GET /api/experiments` report naive vs optimized results:

| Module | Naive policy | Optimized | Gain |
|---|---|---|---|
| Route | Nearest neighbour: 80 min | Hungarian + branching: 70 min | 12.5% less time |
| Assignment | Greedy: 414 | Hungarian: 445 | 7.5% more score |
| Crafting | Equal split adjusted to feasibility: 111 | Simplex / Big-M: 117 | 5.4% more score |
| Whole pipeline | Infeasible (40 min left for crafting) | 562 | Shows the stage dependency |

It also runs 20 seeded random maps of 8 to 10 nodes and reports the average route gain, average assignment gain and solver time, so the results do not rest on one example. The maps are reproducible for a given seed; timings vary between runs.

## Documentation

- [`docs/demo_plan.md`](docs/demo_plan.md): problem statement, dataset, expected results, architecture
- [`docs/api-contract.md`](docs/api-contract.md): JSON envelope and endpoint formats
- [`docs/parts.md`](docs/parts.md): who built which part
- [`docs/decisions.md`](docs/decisions.md): design decisions and defaults

## Status

All four stages are implemented, tested and wired end to end:

- **Backend:** simplex (Big-M and Two-Phase), sensitivity analysis and crafting service, Hungarian assignment, TSP, convex hull and geometry, pipeline, baselines and the 20-map experiment.
- **Frontend:** app shell with step player and scenario panel, and the Map, Matchups, Loadout and Summary tabs.
