# Frontend Tabs Integration Guide (Parts 7, 8, 9, 10)

This document provides turnkey implementation blueprints for connecting **Part 7 (Map)**, **Part 8 (Matchups)**, **Part 9 (Loadout)**, and **Part 10 (Summary)** to the Part 6 foundation.

---

## 1. Part 7: Map Tab Integration (`tabs/MapTab.jsx`)

### 1.1 What Part 7 Consumes from Part 6
- **Props:** `{ scenario }` from `App.jsx`.
- **Scenario Fields Used:** `scenario.nodes` (8 checkpoints) and `scenario.loot` (4 loot items).
- **API Endpoints:**
  - `api.hull(points)`: takes a flat dictionary of `{ Base: [x,y], ... }` (which `api.js` wraps in `{ points }` for the backend).
  - `api.route({ points })` (or `api.route({ matrix, labels })`).
- **StepPlayer Target:** The 23-node Branch-and-Bound search tree from `routeData.steps`.

### 1.2 Copy-Paste Implementation Template for Part 7
```jsx
import React, { useState } from "react";
import { api } from "../api.js";
import { useApi } from "../useApi.js";
import Status from "../components/Status.jsx";
import StepPlayer from "../components/StepPlayer.jsx";

export default function MapTab({ scenario }) {
  const [useNearestNeighbour, setUseNearestNeighbour] = useState(false);

  // Fetch convex hull vertices using all 12 points (8 nodes + 4 loot drops).
  // api.hull takes the flat points dictionary; api.js wraps it into { points } for the backend.
  const hullApi = useApi(
    () => api.hull({ ...(scenario?.nodes || {}), ...(scenario?.loot || {}) }),
    [scenario?.nodes, scenario?.loot]
  );

  // Fetch TSP optimal tour and B&B steps
  const routeApi = useApi(
    () => api.route({ points: scenario?.nodes }),
    [scenario?.nodes]
  );

  const loading = hullApi.loading || routeApi.loading;
  const error = hullApi.error || routeApi.error;
  const routeData = routeApi.data;
  const hullData = hullApi.data;

  // Active tour: 70 min (optimal) vs 80 min (nearest neighbour baseline)
  const activeTour = useNearestNeighbour
    ? routeData?.answer?.nearest_neighbour
    : { tour: routeData?.answer?.tour, cost: routeData?.answer?.cost };

  return (
    <section className="panel" aria-label="Map Module">
      <div className="title-row" style={{ marginBottom: "16px" }}>
        <h2>Stage 1 & 2: Safe Boundary (Hull) & Fastest Tour (TSP)</h2>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => setUseNearestNeighbour((prev) => !prev)}
        >
          {useNearestNeighbour ? "Show Optimal Tour (70 min)" : "Show Nearest Neighbour (80 min)"}
        </button>
      </div>

      <Status loading={loading} error={error} result={routeData}>
        {/* Tour Metric Cards */}
        <div className="limits-grid" style={{ marginBottom: "16px" }}>
          <div className="panel" style={{ padding: "12px", background: "var(--card-bg)" }}>
            <span style={{ color: "var(--muted)", fontSize: "0.8rem" }}>Tour Cost</span>
            <div style={{ fontSize: "1.4rem", fontWeight: "bold", color: "var(--accent)" }}>
              {activeTour?.cost ?? "--"} min
            </div>
          </div>
          <div className="panel" style={{ padding: "12px", background: "var(--card-bg)" }}>
            <span style={{ color: "var(--muted)", fontSize: "0.8rem" }}>Hull Vertices</span>
            <div style={{ fontSize: "1.4rem", fontWeight: "bold", color: "var(--ok)" }}>
              {hullData?.answer?.vertices?.length ?? "--"} vertices
            </div>
          </div>
        </div>

        {/* Reusable StepPlayer for TSP Branch-and-Bound Nodes */}
        <h3>Branch-and-Bound Solver Trace</h3>
        <StepPlayer steps={routeData?.steps || []}>
          {(step, index) => (
            <div className="panel" style={{ background: "var(--bg-dark)" }}>
              <h4>B&B Node #{step.node} {step.status === "feasible" ? "(Feasible Tour)" : `(${step.status})`}</h4>
              <p><strong>Cost:</strong> {step.cost} min | <strong>Incumbent:</strong> {step.incumbent ?? "None"} min</p>
              <p><strong>Branched Arc:</strong> {step.branched_arc ? `${step.branched_arc[0]} → ${step.branched_arc[1]}` : "Root"}</p>
              {step.subtours?.length > 0 && (
                <p><strong>Subtours:</strong> {step.subtours.map((st) => st.join("→")).join(" | ")}</p>
              )}
            </div>
          )}
        </StepPlayer>
      </Status>
    </section>
  );
}
```

---

## 2. Part 8: Matchups Tab Integration (`tabs/MatchupsTab.jsx`)

### 2.1 What Part 8 Consumes from Part 6
- **Props:** `{ scenario }` from `App.jsx`.
- **Scenario Fields Used:** `scenario.weapon_boss_scores` (5×5 matrix).
- **API Endpoints:**
  - `api.assign(scores, true)` (square 5×5 demo = 445; unbalanced 5×4 = 385).
  - Extra demo cases from `FIXTURE_EXTRAS.assignAdjust` for testing cover/adjust loops.
- **StepPlayer Target:** Hungarian phases: `convert` → `row_reduce` → `col_reduce` → `cover` → `adjust` → `final`.

### 2.2 Copy-Paste Implementation Template for Part 8
```jsx
import React, { useState, useMemo } from "react";
import { api, FIXTURE_EXTRAS } from "../api.js";
import { useApi } from "../useApi.js";
import Status from "../components/Status.jsx";
import StepPlayer from "../components/StepPlayer.jsx";

export default function MatchupsTab({ scenario }) {
  const [unbalanced, setUnbalanced] = useState(false);

  // useMemo prevents rebuilding scores on every render, which would cause
  // useApi to re-fetch in an infinite loop (new array identity → effect re-fires).
  const scores = useMemo(() => {
    const raw = scenario?.weapon_boss_scores || [];
    return unbalanced ? raw.map((r) => r.slice(0, 4)) : raw;
  }, [scenario?.weapon_boss_scores, unbalanced]);

  const { loading, error, data } = useApi(
    () => api.assign(scores, true),
    [scores]
  );

  return (
    <section className="panel" aria-label="Matchups Module">
      <div className="title-row" style={{ marginBottom: "16px" }}>
        <h2>Stage 3: Weapon-to-Boss Matchups (Hungarian Method)</h2>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => setUnbalanced((prev) => !prev)}
        >
          {unbalanced ? "Switch to 5×5 Balanced Grid" : "Switch to 5×4 Unbalanced Grid"}
        </button>
      </div>

      <Status loading={loading} error={error} result={data}>
        <div style={{ marginBottom: "16px" }}>
          <h3>Total Combat Score: <span style={{ color: "var(--accent)" }}>{data?.answer?.total}</span></h3>
          <p>
            <strong>Pairs:</strong>{" "}
            {data?.answer?.pairs?.map(([w, b]) => `Weapon ${w} → Boss ${b}`).join(", ")}
          </p>
        </div>

        {/* Reusable StepPlayer for Hungarian Phases */}
        <h3>Hungarian Algorithm Steps</h3>
        <StepPlayer steps={data?.steps || []}>
          {(step, index) => (
            <div className="panel" style={{ background: "var(--bg-dark)" }}>
              <h4>Phase: <span style={{ color: "var(--accent)" }}>{step.phase}</span></h4>
              <p><strong>Note:</strong> {step.note}</p>
              {step.delta && <p><strong>Adjustment Delta:</strong> {step.delta}</p>}
              
              {/* Matrix Visualizer */}
              <table className="scenario-table" style={{ maxWidth: "400px", marginTop: "12px" }}>
                <tbody>
                  {step.matrix.map((row, r) => (
                    <tr key={r}>
                      {row.map((cell, c) => {
                        const isCoveredRow = step.covered_rows?.includes(r + 1);
                        const isCoveredCol = step.covered_cols?.includes(c + 1);
                        const isSelected = step.selected?.some(([sr, sc]) => sr === r + 1 && sc === c + 1);
                        return (
                          <td
                            key={c}
                            style={{
                              background: isSelected
                                ? "var(--ok-bg)"
                                : isCoveredRow || isCoveredCol
                                ? "var(--warn-bg)"
                                : "transparent",
                              fontWeight: isSelected ? "bold" : "normal",
                            }}
                          >
                            {cell}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </StepPlayer>
      </Status>
    </section>
  );
}
```

---

## 3. Part 9: Loadout Tab Integration (`tabs/LoadoutTab.jsx`)

### 3.1 What Part 9 Consumes from Part 6
- **Props:** `{ scenario }` from `App.jsx`.
- **Cross-Stage Reactivity:**
  - Automatically calculates craft time: `derivedCraftTime = Math.max(0, scenario.total_time - 70)`.
  - When the user modifies `Raid Time Limit` in `ScenarioPanel`, `scenario.total_time` updates, driving `craftTime` directly.
  - An optional slider allows testing custom overrides, which resets when `scenario.total_time` changes.
- **API Endpoints:**
  - `api.craft({ time_limit, recipes, limits, method })`.
  - Supports `method: "bigm"` (default) or `method: "twophase"`.
  - Infeasibility test: setting time to `< 42 min` returns `infeasible`.
- **StepPlayer & Status:**
  - Replays Simplex tableau iterations (`columns`, `basis`, `tableau`, `pivot`, `z`, `zrow`).
  - When infeasible, `<Status result={data}>` displays the diagnostic warning banner while `<StepPlayer>` continues rendering the tableau trace!

### 3.2 Copy-Paste Implementation Template for Part 9
```jsx
import React, { useState, useEffect } from "react";
import { api } from "../api.js";
import { useApi } from "../useApi.js";
import Status from "../components/Status.jsx";
import StepPlayer from "../components/StepPlayer.jsx";

// Fixture-based optimal tour cost. Parts 7/10 will replace this with the live
// value from api.route (answer.cost) or api.pipeline (tour_time) once integrated.
const FIXTURE_OPTIMAL_TOUR_MIN = 70;

export default function LoadoutTab({ scenario }) {
  const [method, setMethod] = useState("bigm");
  const [customOverride, setCustomOverride] = useState(null);

  // Derive craft time directly from scenario.total_time minus the fixture optimal tour
  const derivedCraftTime = Math.max(0, (scenario?.total_time ?? 120) - FIXTURE_OPTIMAL_TOUR_MIN);
  const activeCraftTime = customOverride ?? derivedCraftTime;

  // Reset custom slider override whenever scenario.total_time changes
  useEffect(() => {
    setCustomOverride(null);
  }, [scenario?.total_time]);

  const { loading, error, data } = useApi(
    () =>
      api.craft({
        time_limit: activeCraftTime,
        recipes: scenario?.recipes,
        limits: scenario?.limits,
        method,
      }),
    [activeCraftTime, scenario?.recipes, scenario?.limits, method]
  );

  return (
    <section className="panel" aria-label="Loadout Module">
      <div className="title-row" style={{ marginBottom: "16px" }}>
        <h2>Stage 4: Crafting Optimization (Simplex LP & Sensitivity)</h2>
        <div className="btn-group">
          <button
            type="button"
            className={`btn ${method === "bigm" ? "btn-active" : "btn-secondary"}`}
            onClick={() => setMethod("bigm")}
          >
            Big-M Method
          </button>
          <button
            type="button"
            className={`btn ${method === "twophase" ? "btn-active" : "btn-secondary"}`}
            onClick={() => setMethod("twophase")}
          >
            Two-Phase Method
          </button>
        </div>
      </div>

      {/* Craft Time Slider synced with scenario.total_time */}
      <div className="panel" style={{ background: "var(--card-bg)", marginBottom: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <label htmlFor="time-slider">
            <strong>Available Crafting Time:</strong> {activeCraftTime} min
            {customOverride !== null && (
              <span style={{ color: "var(--accent)", marginLeft: "8px" }}>(Manual Slider Override)</span>
            )}
            {activeCraftTime < 42 && (
              <span style={{ color: "var(--warn)", marginLeft: "8px" }}>(Infeasible Region &lt; 42 min)</span>
            )}
          </label>
          {customOverride !== null && (
            <button
              type="button"
              className="btn btn-xs btn-secondary"
              onClick={() => setCustomOverride(null)}
            >
              Reset to Scenario Time ({derivedCraftTime} min)
            </button>
          )}
        </div>

        <input
          id="time-slider"
          type="range"
          min={0}
          max={Math.max(derivedCraftTime + 10, 60)}
          value={activeCraftTime}
          onChange={(e) => setCustomOverride(Number(e.target.value))}
          className="step-scrubber"
          style={{ marginTop: "8px" }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--muted)" }}>
          <span>0 min</span>
          <span>42 min (Min Feasible, Z=111)</span>
          <span>{derivedCraftTime} min (From Scenario)</span>
          <span>{Math.max(derivedCraftTime + 10, 60)} min</span>
        </div>
      </div>

      {/* Status renders infeasible warning while preserving StepPlayer */}
      <Status loading={loading} error={error} result={data}>
        {data?.status === "optimal" && (
          <div className="limits-grid" style={{ marginBottom: "16px" }}>
            <div className="panel" style={{ background: "var(--bg-dark)" }}>
              <span>Bonus Score (Z)</span>
              <div style={{ fontSize: "1.4rem", fontWeight: "bold", color: "var(--accent)" }}>
                {data.answer.z}
              </div>
            </div>
            <div className="panel" style={{ background: "var(--bg-dark)" }}>
              <span>Crafting Plan (x1..x4)</span>
              <div style={{ fontSize: "1.1rem", fontWeight: "600" }}>
                ({data.answer.x.join(", ")})
              </div>
            </div>
            <div className="panel" style={{ background: "var(--bg-dark)" }}>
              <span>Bottleneck</span>
              <div style={{ fontSize: "0.9rem", color: "var(--warn)" }}>
                {data.answer.bottleneck}
              </div>
            </div>
          </div>
        )}

        {/* Simplex Tableaux Stepper */}
        <h3>Tableau Pivoting Trace</h3>
        <StepPlayer steps={data?.steps || []}>
          {(step, index) => (
            <div className="panel" style={{ background: "var(--bg-dark)" }}>
              <h4>
                Iteration {step.iteration} ({step.phase}) — Basis: [{step.basis.join(", ")}]
              </h4>
              <p>
                <strong>Entering:</strong> {step.entering ?? "None"} |{" "}
                <strong>Leaving:</strong> {step.leaving ?? "None"} |{" "}
                <strong>Pivot:</strong> {step.pivot ? `[Row ${step.pivot[0]}, Col ${step.pivot[1]}]` : "Final"}
              </p>

              {/* Tableau Table */}
              <div className="table-responsive">
                <table className="scenario-table">
                  <thead>
                    <tr>
                      <th>Basis</th>
                      {step.columns.map((col) => <th key={col}>{col}</th>)}
                      <th>RHS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {step.tableau.map((row, r) => (
                      <tr key={r}>
                        <td className="item-name">{step.basis[r]}</td>
                        {row.map((val, c) => {
                          const isPivot = step.pivot && step.pivot[0] === r && step.pivot[1] === c;
                          return (
                            <td
                              key={c}
                              style={{
                                background: isPivot ? "var(--accent-glow)" : "transparent",
                                color: isPivot ? "var(--accent)" : "inherit",
                                fontWeight: isPivot ? "bold" : "normal",
                              }}
                            >
                              {val}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </StepPlayer>
      </Status>
    </section>
  );
}
```

---

## 4. Part 10: Summary Tab Integration (`tabs/SummaryTab.jsx`)

### 4.1 What Part 10 Consumes from Part 6
- **Props:** `{ scenario }` from `App.jsx`.
- **API Endpoints:**
  - `api.pipeline(scenario, "optimal")`: returns `{ tour_time: 70, craft_time: 50, combat: 445, crafting: 117, total: 562 }`.
  - `api.pipeline(scenario, "nearest_neighbour")`: returns `{ status: "infeasible", tour_time: 80, craft_time: 40, combat: 445, crafting: null, total: null, message: "..." }`.
  - `api.experiments()`: returns module comparisons (12.5% route gain, 7.5% combat gain) and 20-map random benchmarking summary.
- **Gain Calculations:**
  - Route: 70 min vs 80 min = $\frac{80 - 70}{80} = 12.5\%$ faster tour time.
  - Combat: 445 vs 414 = $\frac{445 - 414}{414} = 7.49\% \approx 7.5\%$ combat score gain.
  - Whole Pipeline: Naive route makes crafting infeasible, highlighting stage dependency.

### 4.2 Copy-Paste Implementation Template for Part 10
```jsx
import React from "react";
import { api } from "../api.js";
import { useApi } from "../useApi.js";
import Status from "../components/Status.jsx";

export default function SummaryTab({ scenario }) {
  const pipelineOpt = useApi(() => api.pipeline(scenario, "optimal"), [scenario]);
  const pipelineNaive = useApi(() => api.pipeline(scenario, "nearest_neighbour"), [scenario]);
  const experimentsApi = useApi(() => api.experiments(), []);

  const loading = pipelineOpt.loading || pipelineNaive.loading || experimentsApi.loading;
  const error = pipelineOpt.error || pipelineNaive.error || experimentsApi.error;

  const opt = pipelineOpt.data?.answer;
  const naive = pipelineNaive.data?.answer;
  const exp = experimentsApi.data?.answer;

  return (
    <section className="panel" aria-label="Summary Module">
      <h2>Overall Raid Performance & Stage Chaining</h2>

      {/* Pass result={pipelineOpt.data} so any solver infeasibility is clearly displayed */}
      <Status loading={loading} error={error} result={pipelineOpt.data}>
        {/* Total Score Comparison Cards */}
        <div className="limits-grid" style={{ marginBottom: "20px" }}>
          <div className="panel" style={{ background: "var(--card-bg)", borderLeft: "4px solid var(--ok)" }}>
            <h3>Optimized Pipeline</h3>
            <p>Tour Time: <strong>{opt?.tour_time ?? "—"} min</strong> (Hungarian + B&B)</p>
            <p>Combat Score: <strong>{opt?.combat ?? "—"}</strong></p>
            <p>Crafting Score: <strong>{opt?.crafting != null ? opt.crafting : "—"}</strong> ({opt?.craft_time ?? "—"} min remaining)</p>
            <hr style={{ borderColor: "var(--panel-border)" }} />
            <h2 style={{ color: "var(--ok)", margin: 0 }}>
              Total Score: {opt?.total ?? "—"}
            </h2>
          </div>

          <div className="panel" style={{ background: "var(--card-bg)", borderLeft: "4px solid var(--danger)" }}>
            <h3>Naive Pipeline</h3>
            <p>Tour Time: <strong>{naive?.tour_time ?? "—"} min</strong> (Nearest Neighbour{opt?.tour_time && naive?.tour_time ? `, ${(((naive.tour_time - opt.tour_time) / opt.tour_time) * 100).toFixed(1)}% slower` : ""})</p>
            <p>Combat Score: <strong>{naive?.combat ?? "—"}</strong></p>
            <p>
              Crafting Score:{" "}
              <strong style={{ color: "var(--danger)" }}>
                {naive?.crafting != null ? naive.crafting : `Infeasible (${naive?.craft_time ?? "—"} min left)`}
              </strong>
            </p>
            <hr style={{ borderColor: "var(--panel-border)" }} />
            <h2 style={{ color: "var(--danger)", margin: 0 }}>
              Total: {naive?.total != null ? naive.total : "Infeasible"}
            </h2>
          </div>
        </div>

        {/* Benchmarking Experiments Table from GET /api/experiments */}
        {exp?.modules && (
          <div style={{ marginTop: "24px" }}>
            <h3>Module-by-Module Gains</h3>
            <div className="table-responsive">
              <table className="scenario-table">
                <thead>
                  <tr>
                    <th>Module</th>
                    <th>Naive Policy</th>
                    <th>Optimized Solver</th>
                    <th>Gain</th>
                  </tr>
                </thead>
                <tbody>
                  {exp.modules.map((m) => (
                    <tr key={m.module}>
                      <td className="item-name">{m.module}</td>
                      <td>{m.naive != null ? `${m.naive} ${m.unit}` : "N/A"}</td>
                      <td>{m.optimized != null ? `${m.optimized} ${m.unit}` : "N/A"}</td>
                      <td style={{ color: "var(--ok)", fontWeight: "bold" }}>
                        {m.gain_pct != null ? `${m.gain_pct}%` : "Infeasible gap"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 20-Map Random Benchmark Summary */}
        {exp?.random_maps && (
          <div className="panel" style={{ background: "var(--bg-dark)", marginTop: "16px" }}>
            <h4>20 Seeded Random Maps Summary</h4>
            <p>
              Average TSP Gain: <strong>{exp.random_maps.avg_route_gain_pct ?? "—"}%</strong> |{" "}
              Average Combat Gain: <strong>{exp.random_maps.avg_assign_gain_pct ?? "—"}%</strong>
            </p>
          </div>
        )}
      </Status>
    </section>
  );
}
```
