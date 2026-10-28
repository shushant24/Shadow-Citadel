# Shadow Citadel Raid Optimizer

CS2105 Optimization Techniques, Option 2 (RPG / Battle Royale raid score optimizer).
A four-stage pipeline of hand-written solvers: convex hull, TSP (Hungarian + subtour branching), weapon assignment (Hungarian), crafting LP (Big-M / Two-Phase simplex with shadow prices). Demo scenario target: **445 combat + 117 crafting = 562**.

Full plan: [`docs/demo_plan.md`](docs/demo_plan.md) · Who builds what: [`docs/parts.md`](docs/parts.md) · JSON contract: [`docs/api-contract.md`](docs/api-contract.md)

## Layout
```
data/        scenario.json (plan 3.5) and time_matrix.json (plan 3.2, the expected oracle)
fixtures/    shared mock responses; frontend runs on them, backend tests check against them
backend/     FastAPI app; solvers/ (hand-written, stubs) and api/ (one router per endpoint)
frontend/    React + Vite; 4 tabs (Map, Matchups, Loadout, Summary) + shared step player
docs/        plan, parts/owners, API contract
```

## Quick start
```bash
make setup            # venv + pip install, npm install
make dev-backend      # http://localhost:8000  (docs at /docs)
make dev-frontend     # http://localhost:5173  (starts on fixtures, no backend needed)
make test             # pytest + vitest
```
Without `make`: `cd backend && python -m venv .venv && .venv/bin/pip install -r requirements-dev.txt && .venv/bin/pytest -q`, and `cd frontend && npm install && npm run dev`.

To use the live API instead of fixtures: `cp frontend/.env.example frontend/.env` and set `VITE_USE_FIXTURES=false`.

## How the test suite guides the work
Each part's "Done when" values from the plan are already written as tests, marked `@pending` (a strict expected failure while the solver raises `NotImplementedError`). When your solver is correct, the strict marker turns the test red with XPASS: delete `@pending` and it becomes a normal test. A wrong answer fails normally. `tests/test_data_integrity.py` and `tests/test_no_forbidden_imports.py` already pass and guard the shared data and the "no library solvers" rule (no scipy / linprog / pulp inside `solvers/` or `api/`; use such tools only as test oracles).

## Status
All solvers and tabs are stubs. `GET /api/scenario` and `GET /api/health` work; other endpoints return 501 until their part lands.
