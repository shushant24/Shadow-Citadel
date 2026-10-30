# Shadow Citadel Raid Optimizer

CS2105 Optimization Techniques, Option 2 (RPG / Battle Royale raid score optimizer).
A four-stage pipeline of hand-written solvers: convex hull, TSP (Hungarian + subtour branching), weapon assignment (Hungarian), crafting LP (Big-M / Two-Phase simplex with shadow prices). Demo scenario target: **445 combat + 117 crafting = 562**.

Full plan: [`docs/demo_plan.md`](docs/demo_plan.md) · Who builds what: [`docs/parts.md`](docs/parts.md) · JSON contract: [`docs/api-contract.md`](docs/api-contract.md) · Open decisions and defaults: [`docs/decisions.md`](docs/decisions.md) · What changed in this version: [`docs/changes-v2.md`](docs/changes-v2.md)

## Layout
```
data/        scenario.json (plan 3.5) and time_matrix.json (plan 3.2, the expected oracle)
fixtures/    shared mock responses with REAL traces (tableaux, B&B nodes, Hungarian phases); the frontend
             runs on them, backend tests check against them
backend/     FastAPI app; solvers/ (hand-written, stubs), api/ (one router per endpoint),
             contract.py (executable JSON contract, no dependencies)
frontend/    React + Vite; 4 tabs (Map, Matchups, Loadout, Summary) + shared step player and Status
docs/        plan, parts/owners, API contract, decisions, report template
```

## Quick start
```bash
make setup            # venv + pip install, npm install
make dev-backend      # http://localhost:8000  (docs at /docs)
make dev-frontend     # http://localhost:5173  (starts on fixtures, no backend needed)
make test             # pytest + vitest
```
Without `make`: `cd backend && python -m venv .venv && .venv/bin/pip install -r requirements-dev.txt && .venv/bin/pytest -q`, and `cd frontend && npm install && npm run dev`.

After the first `npm install`, **commit `frontend/package-lock.json`** so everyone (and CI) gets the same versions.

To use the live API instead of fixtures: `cp frontend/.env.example frontend/.env` and set `VITE_USE_FIXTURES=false`. Fixture mode is canned (see "Fixture mode" in the contract): sliders, edits and dragging only recompute against the live backend.

## How the test suite guides the work
- Each part's "Done when" values are written as tests marked `@pending` (a strict expected failure while the solver raises `NotImplementedError`). When your solver is correct the strict marker turns the test red with XPASS: delete `@pending` and it becomes a normal test. A wrong answer fails normally.
- `tests/test_contract_shapes.py` checks every fixture against `backend/contract.py` and replays the traces (B&B tree, tableau pricing, Hungarian phases). It passes today and must keep passing. **Every endpoint and solver test also validates its output with `check_contract(...)`**, so a format drift fails a test instead of breaking the frontend a week later.
- `tests/test_data_integrity.py` and `tests/test_no_forbidden_imports.py` guard the shared data and the "no library solvers" rule (checked with `ast`: no scipy / linprog / pulp inside `solvers/` or `api/`; use such tools only as test oracles in `tests/`).

## Status
All solvers and tabs are stubs. `GET /api/scenario` and `GET /api/health` work; other endpoints return 501 until their part lands. The fixtures and contract are complete, so every tab can be built against realistic data today.
