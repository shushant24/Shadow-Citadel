# Backend Solvers Integration Guide (Parts 1, 2, 3, 4, 5)

This document provides the exact specifications for backend engineers (Parts 1–5) to connect their Python solvers and FastAPI routers to Part 6's API client ([`api.js`](../frontend/src/api.js)), envelope handler ([`Status.jsx`](../frontend/src/components/Status.jsx)), and replay player ([`StepPlayer.jsx`](../frontend/src/components/StepPlayer.jsx)).

---

## 1. Backend Wiring Matrix

| Backend Part | Endpoint | Router File | Target Frontend Consumer | Envelope Answer Target |
|---|---|---|---|---|
| **Part 5** | `GET /api/scenario` | `backend/api/api_geometry.py` | App Mount (`App.jsx`, `ScenarioPanel.jsx`) | Raw JSON matching `data/scenario.json` |
| **Part 5** | `POST /api/hull` | `backend/api/api_geometry.py` | Map Tab (`MapTab.jsx`) | `vertices`, `interior` |
| **Part 4** | `POST /api/route` | `backend/api/api_route.py` | Map Tab (`MapTab.jsx`) | `tour`, `cost`, `relaxation_cost`, `first_subtours`, `nearest_neighbour` |
| **Part 3** | `POST /api/assign` | `backend/api/api_assign.py` | Matchups Tab (`MatchupsTab.jsx`) | `pairs`, `total`, `unassigned` |
| **Part 1 & 2** | `POST /api/craft` | `backend/api/api_craft.py` | Loadout Tab (`LoadoutTab.jsx`) | `x`, `z`, `shadow_prices`, `binding`, `method`, `bottleneck` |
| **Part 5** | `POST /api/pipeline` | `backend/api/api_pipeline.py` | Summary Tab (`SummaryTab.jsx`) | `tour_time`, `craft_time`, `combat`, `crafting`, `total` |
| **Part 10** | `GET /api/experiments`| `backend/api/api_experiments.py` | Summary Tab (`SummaryTab.jsx`) | `modules`, `random_maps` |

---

## 2. Endpoint Specifications & Step Shapes

### 2.1 Convex Hull & Geometry (Part 5)
- **Endpoint:** `POST /api/hull`
- **Request Body:**
  ```json
  { "points": { "Base": [0,0], "C1": [15,18], "L1": [23,12] } }
  ```
- **Response Envelope:**
  ```json
  {
    "status": "optimal",
    "answer": {
      "vertices": ["Base", "C7", "C5", "C6", "L2", "L1", "C2"],
      "interior": ["C1", "C3", "C4", "L3", "L4"]
    },
    "steps": [
      { "action": "push", "point": "Base", "stack": ["Base"] },
      { "action": "push", "point": "C7", "stack": ["Base", "C7"] },
      { "action": "pop", "point": "C7", "stack": ["Base"] }
    ]
  }
  ```
- **Rules:** Output vertices start at `"Base"` and proceed counter-clockwise. Non-vertex collinear points belong in `interior`.

---

### 2.2 TSP Solver & Branch-and-Bound (Part 4)
- **Endpoint:** `POST /api/route`
- **Request Body:** Accepts either:
  1. Points dictionary: `{"points": {"Base": [0,0], "C1": [15,18], ...}}` (Used by drag-to-recompute).
  2. Matrix and labels: `{"matrix": [[0, 23, ...], ...], "labels": ["Base", "C1", ...]}`.
- **Response Envelope:**
  ```json
  {
    "status": "optimal",
    "answer": {
      "tour": ["Base", "C2", "C1", "C6", "C3", "C4", "C5", "C7", "Base"],
      "cost": 70,
      "relaxation_cost": 64,
      "first_subtours": [["Base","C7","C5"], ["C1","C6","C3","C4","C2"]],
      "nearest_neighbour": {
        "tour": ["Base", "C7", "C5", "C3", "C4", "C1", "C6", "C2", "Base"],
        "cost": 80
      }
    },
    "steps": [
      {
        "node": 1,
        "parent": null,
        "forbidden_arcs": [],
        "branched_arc": null,
        "assignment": [["Base","C7"], ["C7","C5"], ["C5","Base"], ["C1","C6"], ...],
        "cost": 64,
        "subtours": [["Base","C7","C5"], ["C1","C6","C3","C4","C2"]],
        "status": "branch",
        "incumbent": null,
        "note": "Root relaxation: cost 64 with 2 subtours"
      }
    ]
  }
  ```

---

### 2.3 Hungarian Method & Assignment (Part 3)
- **Endpoint:** `POST /api/assign`
- **Request Body:**
  ```json
  { "scores": [[82,64,97,43,96], [48,40,61,59,50], ...], "maximize": true }
  ```
- **Response Envelope:**
  ```json
  {
    "status": "optimal",
    "answer": {
      "pairs": [[1,5], [2,3], [3,2], [4,1], [5,4]],
      "total": 445,
      "unassigned": { "rows": [], "cols": [] }
    },
    "steps": [
      {
        "phase": "convert",
        "matrix": [[15, 33, 0, 54, 1], ...],
        "covered_rows": [],
        "covered_cols": [],
        "dummy_rows": [],
        "dummy_cols": [],
        "note": "Converted maximization to minimization (P_max = 97)"
      },
      {
        "phase": "adjust",
        "matrix": [[...]],
        "covered_rows": [1, 3],
        "covered_cols": [2],
        "dummy_rows": [],
        "dummy_cols": [],
        "delta": 2,
        "note": "Adjusted matrix by delta = 2"
      },
      {
        "phase": "final",
        "matrix": [[...]],
        "selected": [[1,5], [2,3], [3,2], [4,1], [5,4]],
        "note": "Optimal assignment found"
      }
    ]
  }
  ```
- **Index Convention:** Indices in `pairs`, `selected`, `covered_rows`, `covered_cols` are **1-based** (Weapon 1, Boss 1).

---

### 2.4 Simplex Engine & Crafting Service (Parts 1 & 2)
- **Endpoint:** `POST /api/craft`
- **Request Body:**
  ```json
  {
    "time_limit": 50,
    "recipes": {
      "score": [8,6,10,7],
      "time": [3,4,5,3],
      "weight": [3,2,4,1],
      "stamina": [4,1,5,3],
      "survival": [5,2,0,3]
    },
    "limits": { "weight": 40, "stamina": 90, "survival_min": 30, "slots": 14 },
    "method": "bigm"
  }
  ```
- **Response Envelope (Optimal):**
  ```json
  {
    "status": "optimal",
    "answer": {
      "x": [7, 0, 4, 3],
      "z": 117,
      "shadow_prices": { "time": 0.75, "weight": 0.5, "slots": 4.25, "stamina": 0, "survival": 0 },
      "binding": ["time", "weight", "slots"],
      "method": "bigm",
      "constraint_names": ["time", "weight", "stamina", "survival", "slots"],
      "bottleneck": "Time is the primary binding constraint (shadow price 0.75 score/min)."
    },
    "steps": [
      {
        "iteration": 0,
        "phase": "bigm",
        "columns": ["x1","x2","x3","x4","s1","s2","s3","e4","a4","a5"],
        "basis": ["s1","s2","s3","a4","a5"],
        "tableau": [[3,4,5,3,1,0,0,0,0,0,50], ...],
        "zrow": {
          "c": [-8, -6, -10, -7, 0, 0, 0, 0, 0, 0, 0],
          "m": [-6, -3, -1, -4, 0, 0, 0, 1, 0, 0, -44]
        },
        "entering": "x1",
        "leaving": "a4",
        "pivot": [3, 0],
        "z": 0,
        "z_m": -44,
        "note": "x1 enters basis, a4 leaves"
      }
    ]
  }
  ```
- **Response Envelope (Infeasible Case — e.g. `time_limit = 40`):**
  ```json
  {
    "status": "infeasible",
    "answer": {
      "message": "Crafting is infeasible with 40 minutes remaining: 14 inventory slots cannot be satisfied.",
      "method": "bigm",
      "constraint_names": ["time", "weight", "stamina", "survival", "slots"]
    },
    "steps": [ "...tableaux leading up to infeasibility..." ]
  }
  ```
- **Conventions:**
  - `pivot` is **0-based** `[row, col]` into the `tableau` matrix.
  - Big-M is **symbolic**: `zrow.m` holds the M coefficients, `zrow.c` holds the constants.

---

### 2.5 Pipeline Chaining Service (Part 5)
- **Endpoint:** `POST /api/pipeline?route=optimal|nearest_neighbour`
- **Request Body:** The scenario file.
- **Response:**
  - When `route=optimal`:
    ```json
    {
      "status": "optimal",
      "answer": {
        "tour_time": 70,
        "craft_time": 50,
        "combat": 445,
        "crafting": 117,
        "total": 562,
        "route_policy": "optimal",
        "tour": ["Base", "C2", "C1", "C6", "C3", "C4", "C5", "C7", "Base"]
      },
      "steps": []
    }
    ```
  - When `route=nearest_neighbour`:
    ```json
    {
      "status": "infeasible",
      "answer": {
        "tour_time": 80,
        "craft_time": 40,
        "combat": 445,
        "crafting": null,
        "total": null,
        "route_policy": "nearest_neighbour",
        "message": "Naive 80-minute tour leaves only 40 minutes for crafting, which is infeasible."
      },
      "steps": []
    }
    ```
