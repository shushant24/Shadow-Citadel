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
      if (ratio >= 0.67) {
        return <span className="score-badge score-badge-high">+{score} pts</span>;
      }
      if (ratio >= 0.33) {
        return <span className="score-badge score-badge-mid">+{score} pts</span>;
      }
      return <span className="score-badge score-badge-low">+{score} pts</span>;
    }

    if (ratio <= 0.33) {
      return <span className="score-badge score-badge-high">{score} cost</span>;
    }
    if (ratio <= 0.67) {
      return <span className="score-badge score-badge-mid">{score} cost</span>;
    }
    return <span className="score-badge" style={{ background: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid rgba(239, 71, 111, 0.3)' }}>{score} cost</span>;
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
    <div className="stat-card" style={{ gap: '14px' }}>
      {/* Title & Score Banner */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px', paddingBottom: '10px', borderBottom: '1px solid var(--panel-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '1.3rem' }}>⚔️</span>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-bright)' }}>
              {maximize ? 'Optimal Combat Assignment' : 'Minimum Cost Matching'}
            </h3>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--muted)' }}>
              Hungarian method global optimum reached
            </p>
          </div>
        </div>

        {/* Total Score Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-dark)', border: '1px solid var(--accent)', borderRadius: 'var(--radius-sm)', padding: '6px 14px', boxShadow: '0 0 10px var(--accent-glow)' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--accent)' }}>
            {maximize ? 'Total Score' : 'Total Cost'}
          </span>
          <span style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--text-bright)', fontFamily: 'var(--font-mono)', lineHeight: 1 }}>
            {total}
          </span>
        </div>
      </div>

      {/* Assignment Pairs Cards */}
      <div className="pairs-grid">
        {pairsInfo.map(({ row, col, benched }, i) => {
          const score = benched ? null : getOriginalScore(row, col);
          return (
            <div
              key={`w-pair-${i}`}
              className={`pair-card ${benched ? 'benched' : ''}`}
            >
              <div className="pair-names">
                <span className="badge badge-accent" style={{ padding: '2px 6px', fontSize: '0.75rem' }}>
                  W{row + 1}
                </span>
                <span className="pair-arrow">➔</span>
                <span style={{ fontWeight: 700, color: 'var(--text-bright)' }}>
                  {benched ? (
                    <span style={{ color: 'var(--muted)', fontStyle: 'italic', fontWeight: 'normal' }}>Benched</span>
                  ) : (
                    `Boss ${col + 1}`
                  )}
                </span>
              </div>

              <div>
                {benched ? (
                  <span className="badge badge-muted">
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
            className="pair-card benched"
          >
            <div className="pair-names">
              <span className="badge badge-muted" style={{ padding: '2px 6px', fontSize: '0.75rem' }}>
                B{col + 1}
              </span>
              <span style={{ color: 'var(--muted)', fontStyle: 'italic' }}>Unassigned</span>
            </div>
            <span className="badge badge-muted">
              No Weapon
            </span>
          </div>
        ))}
      </div>

      {/* Footer with Benchmark Comparison and Step Toggle */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '8px', paddingTop: '10px', borderTop: '1px solid var(--panel-border)' }}>
        <span style={{ color: 'var(--warn)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 600 }}>
          <span>✨</span>
          {summaryText}
        </span>

        <button
          type="button"
          onClick={onViewSteps}
          className="btn btn-secondary btn-sm"
        >
          {stepsShown ? '▲ Hide Steps' : '▼ View Steps'}
        </button>
      </div>
    </div>
  );
}

