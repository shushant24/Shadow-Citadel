// ResultPanel.jsx — Shows optimal pairs, benchmark comparison, and total score.
// Handles both maximize and minimize modes, and unbalanced cases (benched weapons & unassigned bosses).
// Dynamically computes greedy benchmark without hardcoding demo numbers.
// Uses relative score percentiles for badges instead of arbitrary hardcoded cutoffs.

import React from 'react';

/**
 * Computes greedy baseline: each weapon sequentially picks its highest available
 * score (or lowest cost if minimize).
 */
export function computeGreedyScore(matrix, maximize = true) {
  if (!Array.isArray(matrix) || matrix.length === 0 || !Array.isArray(matrix[0])) return null;
  const usedCols = new Set();
  let greedyTotal = 0;
  for (let r = 0; r < matrix.length; r++) {
    let bestVal = null;
    let bestCol = -1;
    for (let c = 0; c < matrix[r].length; c++) {
      if (usedCols.has(c)) continue;
      const val = matrix[r][c];
      if (typeof val !== 'number' || Number.isNaN(val)) continue;
      if (
        bestVal === null ||
        (maximize ? val > bestVal : val < bestVal)
      ) {
        bestVal = val;
        bestCol = c;
      }
    }
    if (bestCol !== -1) {
      usedCols.add(bestCol);
      greedyTotal += bestVal;
    }
  }
  return greedyTotal;
}

export default function ResultPanel({ answer, originalScores, maximize = true, onViewSteps, stepsShown }) {
  if (!answer) return null;

  const { pairsInfo = [], total, unassigned } = answer;
  const unassignedCols = unassigned?.cols || [];

  // Compute matrix min and max for relative badge thresholds
  const allValues = (originalScores || [])
    .flat()
    .filter((v) => typeof v === 'number' && !Number.isNaN(v));
  const minVal = allValues.length > 0 ? Math.min(...allValues) : 0;
  const maxVal = allValues.length > 0 ? Math.max(...allValues) : 100;
  const range = maxVal - minVal;

  function scoreBadge(score) {
    if (score === undefined || score === null) return null;

    // Relative percentile/ratio in [0, 1]
    const ratio = range > 0 ? (score - minVal) / range : 0.5;

    if (maximize) {
      // Top tier (>= 67% of range): Emerald / High damage
      if (ratio >= 0.67) {
        return (
          <span className="font-mono font-extrabold text-xs text-emerald-300 bg-emerald-950/80 border border-emerald-500/60 px-2 py-0.5 rounded-md shadow-sm">
            +{score} pts
          </span>
        );
      }
      // Mid tier (>= 33% of range): Amber / Medium damage
      if (ratio >= 0.33) {
        return (
          <span className="font-mono font-bold text-xs text-amber-300 bg-amber-950/80 border border-amber-500/60 px-2 py-0.5 rounded-md">
            +{score} pts
          </span>
        );
      }
      // Lower tier: Cyan / Base damage
      return (
        <span className="font-mono font-medium text-xs text-cyan-300 bg-cyan-950/80 border border-cyan-500/60 px-2 py-0.5 rounded-md">
          +{score} pts
        </span>
      );
    }

    // Minimization mode (costs: lower is better)
    // Best tier (<= 33% of cost range): Emerald
    if (ratio <= 0.33) {
      return (
        <span className="font-mono font-extrabold text-xs text-emerald-300 bg-emerald-950/80 border border-emerald-500/60 px-2 py-0.5 rounded-md shadow-sm">
          {score} cost
        </span>
      );
    }
    // Mid tier (<= 67% of cost range): Amber
    if (ratio <= 0.67) {
      return (
        <span className="font-mono font-bold text-xs text-amber-300 bg-amber-950/80 border border-amber-500/60 px-2 py-0.5 rounded-md">
          {score} cost
        </span>
      );
    }
    // High cost tier (> 67%): Red / High cost
    return (
      <span className="font-mono font-semibold text-xs text-red-300 bg-red-950/80 border border-red-500/60 px-2 py-0.5 rounded-md">
        {score} cost
      </span>
    );
  }

  function getOriginalScore(row, col) {
    if (row === null || col === null) return null;
    return originalScores?.[row]?.[col] ?? null;
  }

  // Contextual optimization summary text calculated dynamically from greedy baseline
  const greedy = computeGreedyScore(originalScores, maximize);
  let summaryText = maximize
    ? 'Optimal weapon assignment found with global maximum raid damage.'
    : 'Optimal matching found with global minimum total cost.';

  if (greedy !== null && Number.isFinite(total)) {
    if (maximize) {
      if (total > greedy && greedy > 0) {
        const gainPct = (((total - greedy) / greedy) * 100).toFixed(1);
        summaryText = `Optimized assignment beats greedy selection (${greedy}) by +${gainPct}%!`;
      } else if (total === greedy) {
        summaryText = `Optimized assignment matches greedy selection (${greedy}).`;
      }
    } else {
      if (total < greedy && greedy > 0) {
        const savedPct = (((greedy - total) / greedy) * 100).toFixed(1);
        summaryText = `Optimized matching saves ${savedPct}% cost compared to greedy selection (${greedy} vs ${total}).`;
      } else if (total === greedy) {
        summaryText = `Optimized matching matches greedy selection (${greedy}).`;
      }
    }
  }

  return (
    <div className="bg-[var(--panel,#171e2e)] rounded-xl p-4 border border-[var(--panel-border,#2a3449)] shadow-xl space-y-3">
      {/* Title & Score Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2.5 border-b border-[var(--panel-border,#2a3449)]">
        <div className="flex items-center gap-2">
          <span className="text-xl p-1.5 rounded-lg bg-[var(--accent-glow,rgba(76,201,240,0.15))] border border-[var(--accent,#4cc9f0)]/30">⚔️</span>
          <div>
            <h2 className="text-base font-black text-slate-100 tracking-wide">
              {maximize ? 'Optimal Combat Assignment' : 'Minimum Cost Matching'}
            </h2>
            <p className="text-[11px] text-slate-400">Hungarian method global optimum reached</p>
          </div>
        </div>

        {/* Total Score Badge */}
        <div className="flex items-center gap-2.5 bg-slate-950/80 border border-[var(--accent,#4cc9f0)]/50 rounded-lg px-3.5 py-1.5 shadow-[0_0_15px_rgba(76,201,240,0.15)]">
          <span className="text-[11px] uppercase font-extrabold tracking-wider text-[var(--accent,#4cc9f0)]">
            {maximize ? 'Total Score' : 'Total Cost'}
          </span>
          <span className="text-2xl font-black text-white font-mono tracking-tight">
            {total}
          </span>
        </div>
      </div>

      {/* Assignment Pairs Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-2">
        {pairsInfo.map(({ row, col, benched }, i) => {
          const score = benched ? null : getOriginalScore(row, col);
          return (
            <div
              key={`w-pair-${i}`}
              className={`flex items-center justify-between gap-2 whitespace-nowrap px-3 py-2 rounded-lg border text-xs transition-all ${
                benched
                  ? 'bg-slate-950/60 border-slate-700/60 opacity-80'
                  : 'bg-slate-800/80 border-slate-700/80 hover:border-[var(--accent,#4cc9f0)]/50'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className="w-5 h-5 rounded bg-[var(--accent,#4cc9f0)]/20 text-[var(--accent,#4cc9f0)] font-black text-[10px] flex items-center justify-center">
                  W{row + 1}
                </span>
                <span className="text-slate-400 text-[10px]">➔</span>
                <span className="font-bold text-slate-200">
                  {benched ? (
                    <span className="text-slate-400 italic">Benched</span>
                  ) : (
                    `Boss ${col + 1}`
                  )}
                </span>
              </div>

              <div>
                {benched ? (
                  <span className="text-[10px] text-slate-400 font-mono px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800">
                    Benched
                  </span>
                ) : (
                  scoreBadge(score)
                )}
              </div>
            </div>
          );
        })}

        {/* Unassigned Bosses (n < m case) */}
        {unassignedCols.map((col, i) => (
          <div
            key={`unassigned-boss-${i}`}
            className="flex items-center justify-between gap-2 whitespace-nowrap px-3 py-2 rounded-lg border border-slate-700/60 bg-slate-950/60 text-xs opacity-80"
          >
            <div className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded bg-slate-800 text-slate-400 font-black text-[10px] flex items-center justify-center">
                B{col + 1}
              </span>
              <span className="font-medium text-slate-400 italic">Unassigned</span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800">
              No Weapon
            </span>
          </div>
        ))}
      </div>

      {/* Footer with Benchmark Comparison and Step Toggle */}
      <div className="flex flex-wrap items-center justify-between pt-2 border-t border-[var(--panel-border,#2a3449)] text-xs text-slate-400 gap-2">
        <span className="text-[var(--warn,#ffd166)] flex items-center gap-1 font-medium text-[11px]">
          <span>✨</span>
          {summaryText}
        </span>

        <button
          type="button"
          onClick={onViewSteps}
          className="px-3 py-1 rounded-lg bg-[var(--accent,#4cc9f0)]/15 hover:bg-[var(--accent,#4cc9f0)]/25 text-[var(--accent,#4cc9f0)] font-bold border border-[var(--accent,#4cc9f0)]/40 transition-all flex items-center gap-1 shadow-sm cursor-pointer text-xs"
        >
          <span>{stepsShown ? '▲ Hide Steps' : '▼ View Steps'}</span>
        </button>
      </div>
    </div>
  );
}

