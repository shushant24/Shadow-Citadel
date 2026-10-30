# Research Document 1: Requirements and Contract Analysis

## 1. Context and Objective

In the **Shadow Citadel Raid Optimizer** project, the codebase is split into 10 collaborative parts across backend and frontend (documented in `docs/parts.md` and `docs/demo_plan.md`). 

**Part 6** is titled **"App shell and shared components"** and is the primary structural foundation for the entire frontend system.

### 1.1 Specification from `docs/parts.md`
- **Part #:** 6
- **Title:** App shell and shared components
- **Files Owned:** 
  - `frontend/src/App.jsx`
  - `frontend/src/api.js`
  - `frontend/src/components/StepPlayer.jsx`
  - `frontend/src/components/ScenarioPanel.jsx`
  - `frontend/src/components/Status.jsx`
  - `frontend/src/useApi.js`
  - `frontend/src/theme.css`
- **Done When:**
  > "Any tab can plug in a step list and get a working player; editing the scenario updates every tab (`App` already holds the edited scenario; `ScenarioPanel` needs the editable fields); `Status` shows infeasible messages."
- **Paired Review Partners:** Part 5 (Convex hull, geometry and pipeline API) and all Frontend owners (Part 7: Map, Part 8: Matchups, Part 9: Loadout, Part 10: Summary).

### 1.2 Timeline & Critical Path Role (`docs/demo_plan.md` Section 8 & 9)
- **Phase 1 Deliverable:** Shell, Step Player, and fixtures must be functional immediately so frontend teammates can develop tabs in parallel without waiting for backend solvers.
- **Top Risk Identification:**
  > "Part 6 and 10 become bottlenecks. They touch every tab, so start them first and reassign work at phase boundaries if needed."
  Therefore, Part 6 must provide clean, stable interfaces that decouple tabs from underlying API nuances.

---

## 2. API Contract & Architectural Guarantees (`docs/api-contract.md`)

The API contract acts as the single source of truth between backend and frontend. It is executable in `backend/contract.py` and strictly validated by `tests/test_contract_shapes.py`.

### 2.1 The Universal Result Envelope
Every API endpoint (except `GET /api/scenario`) returns the universal envelope:
```json
{
  "status": "optimal" | "infeasible" | "unbounded",
  "answer": {},
  "steps": [{}]
}
```

Key contract rules for Part 6:
1. **Infeasible and Unbounded States:**
   - These are **normal answers**, returning HTTP 200 (not HTTP 4xx/5xx).
   - `status` is set to `"infeasible"` or `"unbounded"`.
   - `answer.message` contains a single human-readable explanation sentence intended to be displayed directly in the UI.
   - `steps` may still be present (e.g., the sequence of Simplex tableaux leading up to infeasibility). The UI must display the infeasible status while still allowing the user to step through the steps!
2. **Error States:**
   - HTTP 422: FastAPI validation error with `{"detail": ...}`.
   - HTTP 501: Not Implemented error: `{"detail": "Part N not implemented yet: ..."}`.
   - Network or server crashes (HTTP 500 / connection refused): Caught and converted into readable alerts by `api.js` and `Status.jsx`.

### 2.2 Endpoint Registry and Request/Response Signatures

| Endpoint | Method | Request Payload | Response `answer` | Step Signature |
|---|---|---|---|---|
| `/api/scenario` | `GET` | *None* | Full scenario object (`data/scenario.json`) | *None* |
| `/api/hull` | `POST` | `{"points": {name: [x,y]}}` | `{"vertices": [...], "interior": [...]}` | `{"action": "push"\|"pop"\|"skip", "point": "...", "stack": [...]}` |
| `/api/route` | `POST` | `{"matrix", "labels"}` or `{"points": {...}}` | `{"tour": [...], "cost": 70, "relaxation_cost": 64, "first_subtours": [...], "nearest_neighbour": {"tour": [...], "cost": 80}}` | B&B Node: `{"node", "parent", "forbidden_arcs", "branched_arc", "assignment", "cost", "subtours", "status", "incumbent", "note"}` |
| `/api/assign` | `POST` | `{"scores": [[...]], "maximize": true}` | `{"pairs": [[1,5],...], "total": 445, "unassigned": {"rows":[], "cols":[]}}` | Phase step: `{"phase", "matrix", "covered_rows", "covered_cols", "dummy_rows", "dummy_cols", "note", "delta", "selected"}` |
| `/api/craft` | `POST` | `{"time_limit", "recipes", "limits", "method": "bigm"\|"twophase"}` | `{"x": [7,0,4,3], "z": 117, "shadow_prices": {...}, "binding": [...], "method": "...", "constraint_names": [...], "bottleneck": "..."}` | Simplex step: `{"iteration", "phase", "columns", "basis", "tableau", "zrow": {"c":[], "m":[]}, "entering", "leaving", "pivot": [r,c], "z", "z_m", "note"}` |
| `/api/pipeline` | `POST` | Full scenario + query param `?route=optimal\|nearest_neighbour` | `{"tour_time": 70, "craft_time": 50, "combat": 445, "crafting": 117, "total": 562, "route_policy": "optimal", "tour": [...]}` | *None* |
| `/api/experiments` | `GET` | *None* | `{"modules": [...], "random_maps": {...}}` | *None* |

---

## 3. Fixture Mode & Client Architecture (`frontend/src/api.js`)

### 3.1 Dual Operating Modes
- **Offline / Fixture Mode (`VITE_USE_FIXTURES=true`, default):**
  - Instant loading, zero backend dependency.
  - Returns deep-cloned JSON fixtures (`structuredClone`) so tab mutations never pollute global state.
  - Canned limits documented in `FIXTURE_LIMITS`:
    - Crafting: `< 42 min` returns `craft_infeasible.json`, `42 min` returns `craft_42.json`, `>= 43 min` returns `craft.json` (or `craft_twophase.json`).
    - Matchups: Square matrix returns `assign.json` (445), non-square returns `assign_unbalanced.json` (385).
    - Extra cases exposed via `FIXTURE_EXTRAS.assignAdjust` for testing cover/adjust iterations.
- **Live Mode (`VITE_USE_FIXTURES=false`):**
  - Calls `http://localhost:8000` (proxied through Vite via `/api`).
  - Supports live re-computation on scenario edits, slider updates, and map point dragging.

---

## 4. Working Rules & PR Checklist (`.github/pull_request_template.md`)

To pass code review and merge Part 6, the following requirements must be strictly satisfied:
1. **Contract Adherence:** Zero deviations from `docs/api-contract.md`.
2. **Component Tests:** At least 2 component tests per deliverable:
   - Renders successfully from fixtures.
   - Handles error and edge states.
3. **Multi-Tab Compatibility:** Verified that `MapTab`, `MatchupsTab`, `LoadoutTab`, and `SummaryTab` receive the scenario and can plug in `StepPlayer` without custom glue code.
4. **Clean Code & Accessibility:** Semantic HTML (`role="tab"`, `role="tablist"`, `role="alert"`, `role="status"`), accessible keyboard navigation, and zero console errors.
