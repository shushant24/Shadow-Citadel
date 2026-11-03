import React from "react";

/**
 * ModuleComparisonCard
 * Renders a comparative horizontal bar chart and metric breakdown for a single module:
 * - Route (80m -> 70m, 12.5% time saved)
 * - Assignment (414 -> 445, 7.5% score gained)
 * - Crafting (111 -> 117, 5.41% score gained)
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
    : "111 score (heuristic)";

  const optimizedDisplay = `${optimized} ${unit}`;

  // Formatted gain text
  let gainText = "";
  let gainSub = "";
  if (isPipeline) {
    gainText = "Enables Feasibility";
    gainSub = "Without TSP optimization, crafting is impossible";
  } else if (gain_pct !== null && gain_pct !== undefined) {
    const rounded = Number(gain_pct).toFixed(roundedDecimals(gain_pct));
    gainText = isLowerBetter ? `${rounded}% Faster` : `+${rounded}% Score`;
    gainSub = isLowerBetter ? "Reduction in raid travel time" : "Increase in damage / yield";
  } else if (name.toLowerCase().includes("craft")) {
    gainText = "+5.41% Score";
    gainSub = "Increase over equal-split heuristic";
  }

  // Bar width calculation (relative scale 0% to 100%)
  let naivePct = 0;
  let optPct = 0;

  if (isPipeline) {
    naivePct = 0;
    optPct = 100;
  } else if (isLowerBetter) {
    // For route: naive (80) is the base (100%), opt (70) is 87.5%
    const maxVal = Math.max(naive || 80, optimized || 70);
    naivePct = maxVal > 0 ? ((naive || 80) / maxVal) * 100 : 100;
    optPct = maxVal > 0 ? ((optimized || 70) / maxVal) * 100 : 87.5;
  } else {
    // Higher is better: optimized is usually highest
    const maxVal = Math.max(naive || 0, optimized || 1);
    naivePct = maxVal > 0 ? ((naive || 0) / maxVal) * 100 : 0;
    optPct = maxVal > 0 ? ((optimized || 0) / maxVal) * 100 : 100;
  }

  // Module Icons / Badges
  const getModuleBadge = (modName) => {
    const lower = modName.toLowerCase();
    if (lower.includes("route")) return { tag: "Stage 2", label: "TSP Optimization" };
    if (lower.includes("assign")) return { tag: "Stage 3", label: "Boss Matchup" };
    if (lower.includes("craft")) return { tag: "Stage 4", label: "Simplex Loadout" };
    return { tag: "Pipeline", label: "Cross-Stage Chaining" };
  };

  const meta = getModuleBadge(name);

  return (
    <div className={`summary-module-card ${isPipeline ? "pipeline-card" : ""}`} data-testid={`module-card-${name.toLowerCase().replace(/\s+/g, "-")}`}>
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
                title="Naive route leaves only 40 min crafting: infeasible"
              >
                <span className="infeasible-stripe-label">Infeasible (40 min remaining)</span>
              </div>
            ) : (
              <div
                className="summary-bar-fill fill-naive"
                style={{ width: `${Math.min(100, Math.max(10, naivePct))}%` }}
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
              style={{ width: `${Math.min(100, Math.max(10, optPct))}%` }}
            />
          </div>
        </div>
      </div>

      <div className="module-card-footer">
        <p className="module-insight">
          {naive_note || getDefaultInsight(name)}
        </p>
        {gainSub && <span className="module-gain-sub">{gainSub}</span>}
      </div>
    </div>
  );
}

function roundedDecimals(num) {
  if (Math.abs(num - Math.round(num)) < 0.05) return 1;
  return 2;
}

function getDefaultInsight(name) {
  const lower = name.toLowerCase();
  if (lower.includes("route")) {
    return "Nearest neighbour accumulates greedy penalties (80m); Hungarian relaxation + B&B finds global 70m tour, saving 10 minutes.";
  }
  if (lower.includes("assign")) {
    return "Greedy assignment yields 414; Hungarian matrix reduction globally coordinates assignments for a maximum score of 445 (+7.5%).";
  }
  if (lower.includes("craft")) {
    return "Equal-split heuristic hits binding limits; Two-Phase / Big-M Simplex exploits shadow prices ($0.75/min, $4.25/slot) to reach 117.";
  }
  return "With an 80m naive route, only 40m remain for crafting, rendering the 14-slot loadout infeasible. The 70m optimal tour enables the full 562-point plan.";
}
