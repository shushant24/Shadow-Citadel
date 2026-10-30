# Pipeline Chaining and Scenario Sync Guide

This document explains the mathematical and reactive dependency chain connecting the 4 stages together through Part 6's [`ScenarioPanel.jsx`](../frontend/src/components/ScenarioPanel.jsx) and [`api.js`](../frontend/src/api.js).

---

## 1. The Core Cross-Stage Dependency

The central hypothesis of the project is that **stages cannot be solved in isolation** because decisions made in early stages constrain downstream possibilities:

$$\text{Time Left for Crafting} = \text{Raid Time Limit} - \text{Tour Duration}$$

$$\text{craft\_time} = \text{scenario.total\_time} - \text{tour\_time}$$

```
+-----------------------------------------------------------------------------------------+
|                                    STAGE 2: TSP ROUTE                                   |
|   Optimized (Hungarian + B&B): 70 min       |     Naive (Nearest Neighbour): 80 min     |
+---------------------------------------------+-------------------------------------------+
                                      |                                     |
                                      v                                     v
+-----------------------------------------------------------------------------------------+
|                                  STAGE 4: CRAFTING LP                                   |
|   120 min - 70 min = 50 min left            |     120 min - 80 min = 40 min left        |
|   Status: OPTIMAL                           |     Status: INFEASIBLE                    |
|   Crafting Score: Z = 117                   |     Crafting Score: Infeasible (Null)   |
|   Plan: x = (7, 0, 4, 3)                    |     Reason: 14 slots cannot be met in 40m|
+---------------------------------------------+-------------------------------------------+
                                      |                                     |
                                      v                                     v
+-----------------------------------------------------------------------------------------+
|                                  WHOLE RAID SCORE TOTAL                                 |
|   445 (Combat) + 117 (Crafting) = 562       |     445 (Combat) + Infeasible = INFEASIBLE|
+---------------------------------------------+-------------------------------------------+
```

---

## 2. Reactive Data Flow Triggered by `ScenarioPanel`

When any parameter is edited in [`ScenarioPanel.jsx`](../frontend/src/components/ScenarioPanel.jsx), the update ripples reactively through Part 6 into the active tab:

```mermaid
sequenceDiagram
    autonumber
    actor Player as User
    participant Panel as ScenarioPanel.jsx
    participant App as App.jsx
    participant Tab as Active Tab (e.g., LoadoutTab)
    participant Solver as Backend / Canned Fixture

    Player->>Panel: Edits Raid Time Limit from 120 to 110 min
    Panel->>App: onChange(updatedScenario)
    App->>App: setEdited(updatedScenario)
    App->>Tab: Re-renders with updated scenario prop
    Tab->>Solver: api.craft({ time_limit: 110 - 70 = 40, ... })
    Solver-->>Tab: Returns { status: "infeasible", answer: { message: "..." }, steps: [...] }
    Tab->>Player: Status.jsx renders infeasible alert; StepPlayer shows final tableau
```

### 2.1 Critical Experiment Scenarios
1. **The 40-minute Infeasible Case:**
   - With the naive 80-minute route, only 40 minutes remain.
   - The minimum craft time required to fill 14 slots is **42 minutes** ($3 \times 13 + 3 \times 1 = 42$).
   - At 40 minutes, Simplex terminates with an artificial variable remaining in the basis ($a_5 > 0$).
2. **The 42-minute Minimum Feasible Case:**
   - At 42 minutes, the solver produces $Z = 111$ with $x = (13, 0, 0, 1)$.
3. **The 50-minute Optimal Case:**
   - At 50 minutes, the solver produces $Z = 117$ with $x = (7, 0, 4, 3)$.
   - Shadow prices: Time ($0.75$), Weight ($0.50$), Slots ($4.25$). Stamina and Survival are non-binding ($0.0$).

---

## 3. End-to-End Live vs. Fixture Mode Sync

### 3.1 Offline / Fixture Mode (`VITE_USE_FIXTURES=true`)
In offline mode, Part 6's [`api.js`](../frontend/src/api.js) routes inputs to pre-computed fixtures to guarantee reproducibility:
- `time_limit < 42` $\rightarrow$ `craft_infeasible.json`
- `time_limit == 42` $\rightarrow$ `craft_42.json`
- `time_limit >= 43` $\rightarrow$ `craft.json` (or `craft_twophase.json`)
- `route === "nearest_neighbour"` $\rightarrow$ `pipeline_naive.json`
- `route === "optimal"` $\rightarrow$ `pipeline.json`

### 3.2 Live Backend Mode (`VITE_USE_FIXTURES=false`)
In live mode, Part 6 proxies HTTP calls to FastAPI at `http://localhost:8000`:
1. Start backend: `cd backend && .venv/bin/uvicorn app:app --reload --port 8000`
2. Configure frontend: Set `VITE_USE_FIXTURES=false` in `frontend/.env`
3. In live mode, dragging points on the map or modifying sliders in Loadout dynamically re-solves the problem in real time.
