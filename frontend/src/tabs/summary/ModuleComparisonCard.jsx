import React from "react";
import { formatGainPct } from "./formatters.js";

/**
 * ModuleComparisonCard
 * Renders a comparative horizontal bar chart and metric breakdown for a single module:
 * - Route (80m -> 70m, 12.5% time saved)
 * - Assignment (414 -> 445, 7.5% score gained)
 * - Crafting (111 -> 117, 5.4% score gained)
 * - Whole Pipeline (Infeasible -> 562, Stage Dependency)
 */
export default function ModuleComparisonCard({ moduleData }) {
  if (!moduleData) return null;

  const {
    module: name,
    naive,
    optimized,
    unit = "",
    gain_pct,
    direction = "higher_is_better",
    naive_note,
  } = moduleData;

  const isLowerBetter = direction === "lower_is_better";
  const isPipeline = name.toLowerCase().includes("pipeline");

  // Determine naive display value and state
  const isNaiveInfeasible = isPipeline && (naive === null || naive === undefined);
  const naiveDisplay = isNaiveInfeasible
    ? "Infeasible"
    : naive !== null && naive !== undefined
    ? `${naive} ${unit}`
    : "n/a";

  const optimizedDisplay = optimized !== null && optimized !== undefined
    ? `${optimized} ${unit}`
    : "n/a";

  // Formatted gain text using consistent 1-decimal formatter
  let gainText = "";
  let gainSub = "";
  if (isPipeline) {
    gainText = "Enables Feasibility";
    gainSub = "Without TSP optimization, crafting is impossible";
  } else if (gain_pct !== null && gain_pct !== undefined) {
    const formatted = formatGainPct(gain_pct, !isLowerBetter);
    gainText = isLowerBetter ? `${formatted} Faster` : `${formatted} Score`;
    gainSub = isLowerBetter ? "Reduction in raid travel time" : "Increase in combat damage / yield";
  } else {
    gainText = "n/a";
  }

  // Bar width calculation (relative scale 0% to 100%)
  let naivePct = 0;
  let optPct = 0;

  if (isPipeline) {
    naivePct = 0;
    optPct = 100;
  } else if (isLowerBetter) {
    const numNaive = Number(naive) || 0;
    const numOpt = Number(optimized) || 0;
    const maxVal = Math.max(numNaive, numOpt);
    naivePct = maxVal > 0 ? (numNaive / maxVal) * 100 : 100;
    optPct = maxVal > 0 ? (numOpt / maxVal) * 100 : 100;
  } else {
    const numNaive = Number(naive) || 0;
    const numOpt = Number(optimized) || 0;
    const maxVal = Math.max(numNaive, numOpt);
    naivePct = maxVal > 0 ? (numNaive / maxVal) * 100 : 0;
    optPct = maxVal > 0 ? (numOpt / maxVal) * 100 : 100;
  }

  // Module Stage Badges
  const getModuleBadge = (modName) => {
    const lower = modName.toLowerCase();
    if (lower.includes("route")) return { tag: "Stage 2", label: "TSP Optimization" };
    if (lower.includes("assign")) return { tag: "Stage 3", label: "Boss Matchup" };
    if (lower.includes("craft")) return { tag: "Stage 4", label: "Simplex Loadout" };
    return { tag: "Pipeline", label: "Cross-Stage Chaining" };
  };

  const meta = getModuleBadge(name);

  return (
    <div
      className={`summary-module-card ${isPipeline ? "pipeline-card" : ""}`}
      data-testid={`module-card-${name.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <div className="module-card-header">
        <div className="module-title-group">
          <span className="module-stage-tag">{meta.tag}</span>
          <h3 className="module-name">{name}</h3>
          <span className="module-desc-tag">{meta.label}</span>
        </div>
        <div className="module-gain-container">
          <span className={`summary-gain-badge ${isPipeline ? "badge-pipeline" : "badge-gain"}`}>
            {gainText}
          </span>
        </div>
      </div>

      <div className="summary-chart-container">
        {/* Naive Baseline Bar */}
        <div className="summary-bar-row naive-row">
          <div className="summary-bar-meta">
            <span className="summary-bar-label">
              <span className="bar-indicator naive-dot" /> Naive Policy:
            </span>
            <span className={`summary-bar-value ${isNaiveInfeasible ? "text-danger text-bold" : ""}`}>
              {naiveDisplay}
            </span>
          </div>
          <div className="summary-bar-track">
            {isNaiveInfeasible ? (
              <div
                className="summary-bar-fill fill-infeasible"
                style={{ width: "100%" }}
                title="Naive route leaves insufficient crafting time: infeasible"
              >
                <span className="infeasible-stripe-label">Infeasible</span>
              </div>
            ) : (
              <div
                className="summary-bar-fill fill-naive"
                style={{ width: `${Math.min(100, Math.max(8, naivePct))}%` }}
              />
            )}
          </div>
        </div>

        {/* Optimized Solution Bar */}
        <div className="summary-bar-row opt-row">
          <div className="summary-bar-meta">
            <span className="summary-bar-label">
              <span className="bar-indicator opt-dot" /> Optimized Policy:
            </span>
            <span className="summary-bar-value text-accent text-bold">
              {optimizedDisplay}
            </span>
          </div>
          <div className="summary-bar-track">
            <div
              className="summary-bar-fill fill-opt"
              style={{ width: `${Math.min(100, Math.max(8, optPct))}%` }}
            />
          </div>
        </div>
      </div>

      <div className="module-card-footer">
        <p className="module-insight">
          {naive_note || getDefaultInsight(name, naive, optimized, gain_pct)}
        </p>
        {gainSub && <span className="module-gain-sub">{gainSub}</span>}
      </div>
    </div>
  );
}

function getDefaultInsight(name, naive, opt, gain) {
  const lower = name.toLowerCase();
  const formattedGain = formatGainPct(gain, false);

  if (lower.includes("route")) {
    return `Nearest neighbour incurs greedy penalties (${naive} min); Hungarian relaxation + B&B finds global ${opt}-minute tour (${formattedGain} faster).`;
  }
  if (lower.includes("assign")) {
    return `Greedy assignment yields ${naive}; Hungarian matrix reduction globally coordinates assignments for a maximum score of ${opt} (${formatGainPct(gain, true)}).`;
  }
  if (lower.includes("craft")) {
    return `Equal-split heuristic hits binding limits (${naive}); Two-Phase / Big-M Simplex exploits shadow prices (0.75 pts/min, 4.25 pts/slot) to reach ${opt}.`;
  }
  return `With a ${naive}m naive route, crafting is infeasible. The ${opt}m optimal tour enables the full plan.`;
}
