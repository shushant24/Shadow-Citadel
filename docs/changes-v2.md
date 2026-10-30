# What changed compared with the first skeleton

## Bugs fixed in the first skeleton
- `tests/test_no_forbidden_imports.py` scanned raw text, so the word "scipy" in `solvers/__init__.py`'s docstring made the "already passing" guard fail. It now parses with `ast` (docstrings and comments are ignored) and has a self-test.
- Unused `import pytest` in two test files would have failed the `ruff check .` step of CI. Removed.
- `api.js` returned the 117-score plan for 42 minutes (the plan says 111). Added `craft_42.json` and routing for it.
- CI `ruff check` failed (33 findings) because `pyproject.toml` did not say which rules to run, so a newer ruff applied extra defaults such as import sorting. The rule set is now explicit (`E4, E7, E9, F`), and the two real findings were fixed: a lambda assigned to a name in `test_part10_baselines_experiments.py`, and over-long lines there.
- `vitest` could break if a developer's `frontend/.env` had `VITE_USE_FIXTURES=false`. The test config now forces fixtures.

## Contract gaps closed (the plan's top risk)
| Gap | Change |
|---|---|
| Tableau step had no column names, pivot, or Big-M representation | `columns`, `basis`, `zrow {c, m}` (symbolic M), `pivot`, `z`, `z_m`, naming convention `x/s/e/a` |
| `shadow_prices(final_tableau)` could not map columns to constraints | `shadow_prices(final_step, constraint_names)` plus a documented reading rule; Two-Phase keeps artificial columns |
| No way to run the naive pipeline | `POST /api/pipeline?route=nearest_neighbour` (80 min tour, 40 min crafting, infeasible) |
| Drag-to-recompute had no matrix source | `/api/route` also accepts `{"points": ...}` and builds the matrix server-side |
| Infeasible/unbounded response shape undocumented | `answer.message` required, HTTP 200, shared `Status` component renders it |
| B&B steps could not draw a tree | `parent`, `branched_arc`, `incumbent`, `note` |
| Assignment steps lacked dummy info and cover/adjust | `dummy_rows/cols`, `unassigned`, `selected`, `delta`; 1-based indices documented |
| Route answer lacked the nearest-neighbour baseline in the contract | Official: `answer.nearest_neighbour` |

## Added
- `backend/contract.py` (executable contract, no dependencies) and `tests/test_contract_shapes.py` (runs today).
- Real fixtures: Big-M and Two-Phase tableau traces, 23-node B&B trace, full Hungarian traces incl. `assign_unbalanced.json` and `assign_adjust.json`, `craft_42.json`, `pipeline_naive.json`. Generated with exact fractions and independent solvers as oracles (the plan's numbers were re-verified the same way).
- More `@pending` acceptance tests per part (step formats, two-phase, unbalanced, adjust, naive pipeline, points request, equal-split baseline).
- `docs/decisions.md`: defaults for open questions (integer vs continuous LP, M handling, pivot rules, B&B scheme, tour direction, ties, floats).
- Frontend: `App` holds the edited scenario, `Status` shows infeasible messages, `api.js` routes fixtures by method/time/shape and exposes `FIXTURE_EXTRAS`, banner explains fixture mode is canned, new tests (`api.test.js`, `Status.test.jsx`).
- `docs/report/` template and screenshot checklist, `docs/optional-stage5.md` (design only), PR template and Makefile (`make contract`) updates.

## Still to do by the team
- Run `npm install` once and commit `frontend/package-lock.json`.
- Fill in the Owner column in `docs/parts.md`.
- Part 10 confirms the equal-split definition (`docs/decisions.md` item 8) and the per-map fields of `/api/experiments`.
