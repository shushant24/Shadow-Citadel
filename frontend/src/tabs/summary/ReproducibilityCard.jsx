import React from "react";
import { api } from "../../api.js";
import { useApi } from "../../useApi.js";
import RaidScore, { minCraftTimeNeeded } from "../../components/RaidScore.jsx";

function Mark({ expected, live }) {
  if (expected == null || live == null) return <span className="text-muted">–</span>;
  const ok = Number(expected) === Number(live);
  return (
    <span className={ok ? "text-ok" : "text-danger"} aria-label={ok ? "match" : "mismatch"}>
      {ok ? "✓" : "✗"}
    </span>
  );
}

/**
 * For a loaded benchmark map: the 20-map table's values next to what the live solvers
 * return for the same map, plus the map's chained raid score.
 */
export default function ReproducibilityCard({ scenario, benchmark }) {
  const nodes = scenario?.nodes;
  const scores = scenario?.weapon_boss_scores;
  const route = useApi(() => api.route({ points: nodes }), [nodes]);
  const assign = useApi(() => api.assign(scores, true), [scores]);
  const pipeline = useApi(() => api.pipeline(scenario, "optimal"), [scenario]);

  const expected = benchmark?.expected ?? null;
  const rows = [
    { name: "Optimal tour (B&B)", unit: "min", exp: expected?.opt_cost, live: route.data?.answer?.cost, src: "/api/route", busy: route.loading },
    { name: "Nearest-neighbour tour", unit: "min", exp: expected?.nn_cost, live: route.data?.answer?.nearest_neighbour?.cost, src: "/api/route", busy: route.loading },
    { name: "Hungarian combat", unit: "pts", exp: expected?.opt_assign, live: assign.data?.answer?.total, src: "/api/assign", busy: assign.loading },
    { name: "Greedy combat", unit: "pts", exp: expected?.greedy_assign, live: benchmark?.recomputed?.greedy_assign, src: "/api/experiments/map (recomputed)", busy: false },
  ];
  const pending = route.loading || assign.loading;
  const fetchError = route.error || assign.error;
  const allMatch = expected && !pending && rows.every((r) => r.live != null && Number(r.exp) === Number(r.live));

  const fmt = (v, unit) => (v == null ? "–" : `${v} ${unit}`);

  return (
    <section className="summary-repro-section" data-testid="repro-card" aria-label="Reproducibility check">
      <div className="section-title-bar">
        <h3>Reproducibility check</h3>
        <span className="section-tag">
          Benchmark map{benchmark?.index != null ? ` #${benchmark.index}` : ""} · seed {benchmark?.seed} · {benchmark?.n_nodes} nodes
        </span>
      </div>

      {benchmark?.edited && (
        <p className="text-warn">The scenario has been edited, so live results may no longer match the table.</p>
      )}
      {!expected && (
        <p className="text-muted">This seed is not one of the 20 benchmark rows: live results only.</p>
      )}
      {fetchError && <p className="text-danger" role="alert">Live solver call failed: {fetchError.message}</p>}

      <div className="repro-grid">
        <div className="table-responsive">
          <table className="summary-table repro-table">
            <thead>
              <tr>
                <th scope="col">Value</th>
                <th scope="col" className="text-right">Table</th>
                <th scope="col" className="text-right">Live solver</th>
                <th scope="col" className="text-center">Match</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.name}>
                  <td title={`live value from ${r.src}`}>{r.name}</td>
                  <td className="text-right font-mono">{fmt(r.exp, r.unit)}</td>
                  <td className="text-right font-mono">{r.busy ? "…" : fmt(r.live, r.unit)}</td>
                  <td className="text-center"><Mark expected={r.exp} live={r.busy ? null : r.live} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {expected && !pending && (
            <p className={allMatch ? "text-ok" : "text-danger"} data-testid="repro-verdict">
              {allMatch ? "All four values reproduced by the live solvers." : "Some values differ from the table."}
            </p>
          )}
        </div>

        <RaidScore
          label="This map's raid score (optimal route)"
          result={pipeline.data}
          loading={pipeline.loading}
          error={pipeline.error}
          minNeeded={minCraftTimeNeeded(scenario)}
          testId="repro-pipeline"
        />
      </div>
    </section>
  );
}
