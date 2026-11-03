import React, { useState } from "react";

/**
 * BenchmarkTable
 * Renders the 20-map Monte Carlo simulation benchmark table and aggregate stat cards:
 * - Average route gain %
 * - Average assignment gain %
 * - Average solver time (ms)
 * - Individual row data for 20 seeded random maps (8 to 10 nodes)
 */
export default function BenchmarkTable({ randomMaps }) {
  const [filterNodes, setFilterNodes] = useState("all");

  if (!randomMaps || !randomMaps.maps || randomMaps.maps.length === 0) {
    return (
      <div className="benchmark-placeholder-card">
        <h4>20-Map Monte Carlo Simulation</h4>
        <p className="text-muted">
          Monte Carlo experiment results are computed live by the backend (/api/experiments).
          Connect to the live backend to view the full 20-map comparative breakdown.
        </p>
      </div>
    );
  }

  const {
    n = 20,
    avg_route_gain_pct = 0,
    avg_assign_gain_pct = 0,
    avg_solver_ms = 0,
    maps = [],
  } = randomMaps;

  const filteredMaps =
    filterNodes === "all"
      ? maps
      : maps.filter((m) => String(m.n_nodes) === filterNodes);

  return (
    <div className="summary-benchmark-section" data-testid="benchmark-section">
      <div className="benchmark-header">
        <div>
          <h3 className="benchmark-title">20-Map Random Experiment Benchmarks</h3>
          <p className="subtitle">
            Demonstrating statistical robustness across 20 independent seeded maps (8 to 10 nodes each)
            with randomized node coordinates and weapon-to-boss scores.
          </p>
        </div>

        <div className="benchmark-filter-row">
          <span className="filter-label">Filter by Nodes:</span>
          <div className="segmented">
            <button
              type="button"
              className={`segment-btn ${filterNodes === "all" ? "active" : ""}`}
              onClick={() => setFilterNodes("all")}
            >
              All ({maps.length})
            </button>
            <button
              type="button"
              className={`segment-btn ${filterNodes === "8" ? "active" : ""}`}
              onClick={() => setFilterNodes("8")}
            >
              8 Nodes
            </button>
            <button
              type="button"
              className={`segment-btn ${filterNodes === "9" ? "active" : ""}`}
              onClick={() => setFilterNodes("9")}
            >
              9 Nodes
            </button>
            <button
              type="button"
              className={`segment-btn ${filterNodes === "10" ? "active" : ""}`}
              onClick={() => setFilterNodes("10")}
            >
              10 Nodes
            </button>
          </div>
        </div>
      </div>

      {/* Aggregate Stat Cards */}
      <div className="stat-grid benchmark-stat-grid">
        <div className="stat-card">
          <span className="stat-label">Avg Route Gain</span>
          <span className="stat-value text-ok">
            {Number(avg_route_gain_pct).toFixed(2)}%
          </span>
          <span className="stat-sub">Travel time reduction (NN vs B&B)</span>
        </div>

        <div className="stat-card">
          <span className="stat-label">Avg Assignment Gain</span>
          <span className="stat-value text-accent">
            +{Number(avg_assign_gain_pct).toFixed(2)}%
          </span>
          <span className="stat-sub">Score improvement (Greedy vs Hungarian)</span>
        </div>

        <div className="stat-card">
          <span className="stat-label">Avg Solver Runtime</span>
          <span className="stat-value">
            {Number(avg_solver_ms).toFixed(2)} ms
          </span>
          <span className="stat-sub">TSP B&B + Hungarian per map</span>
        </div>

        <div className="stat-card">
          <span className="stat-label">Benchmark Scale</span>
          <span className="stat-value text-bright">
            {n} Maps
          </span>
          <span className="stat-sub">Uniform random (8–10 nodes, seed=0)</span>
        </div>
      </div>

      {/* Detailed Table */}
      <div className="table-responsive summary-table-container">
        <table className="summary-table" aria-label="20-Map Monte Carlo Experiment Results">
          <thead>
            <tr>
              <th scope="col" className="text-center">#</th>
              <th scope="col">Seed</th>
              <th scope="col" className="text-center">Nodes</th>
              <th scope="col" className="text-right">Naive Tour (NN)</th>
              <th scope="col" className="text-right">Opt Tour (B&B)</th>
              <th scope="col" className="text-right">Route Gain</th>
              <th scope="col" className="text-right">Naive Combat</th>
              <th scope="col" className="text-right">Opt Combat</th>
              <th scope="col" className="text-right">Combat Gain</th>
              <th scope="col" className="text-right">Time (ms)</th>
            </tr>
          </thead>
          <tbody>
            {filteredMaps.map((row, idx) => (
              <tr key={row.seed ?? idx}>
                <td className="text-center text-muted font-mono">{idx + 1}</td>
                <td className="font-mono text-muted">{row.seed}</td>
                <td className="text-center font-mono">{row.n_nodes}</td>
                <td className="text-right font-mono">{row.nn_cost}m</td>
                <td className="text-right font-mono text-accent">{row.opt_cost}m</td>
                <td className="text-right font-mono text-ok">
                  {row.route_gain_pct > 0 ? `-${Number(row.route_gain_pct).toFixed(1)}%` : "0%"}
                </td>
                <td className="text-right font-mono">{row.greedy_assign}</td>
                <td className="text-right font-mono text-accent">{row.opt_assign}</td>
                <td className="text-right font-mono text-ok">
                  +{Number(row.assign_gain_pct).toFixed(1)}%
                </td>
                <td className="text-right font-mono text-muted">
                  {Number(row.solver_ms).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="summary-table-averages">
              <td colSpan={3} className="text-bold">
                Benchmark Average ({filteredMaps.length} maps)
              </td>
              <td colSpan={2} className="text-right text-muted font-mono">
                Across sample
              </td>
              <td className="text-right text-bold text-ok font-mono">
                -{Number(avg_route_gain_pct).toFixed(2)}%
              </td>
              <td colSpan={2} className="text-right text-muted font-mono">
                Across sample
              </td>
              <td className="text-right text-bold text-ok font-mono">
                +{Number(avg_assign_gain_pct).toFixed(2)}%
              </td>
              <td className="text-right text-bold font-mono">
                {Number(avg_solver_ms).toFixed(2)} ms
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
