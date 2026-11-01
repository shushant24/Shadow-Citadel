// MatrixView.jsx — Hungarian Algorithm Step Visualization (Compact & Minimal)
// Handles: convert, row_reduce, col_reduce, cover, adjust, and final.
// Compact layout ensures playback controls and matrix stay visible without scrolling.

import React from 'react';
import { matrixDiff } from './matrixDiff';
import { PHASE_META, stepCaption } from './stepCaptions';

export default function MatrixView({
  step,
  prevStep,
  finalPairs = [],
  originalCols,
  originalRows,
  originalScores,
  maximize = true,
}) {
  if (!step) return null;
  const { phase, matrix, covered_rows = [], covered_cols = [], delta, note } = step;
  const rows = matrix.length;
  const cols = matrix[0]?.length ?? 0;

  const coveredRowSet = new Set(covered_rows);
  const coveredColSet = new Set(covered_cols);
  const finalSet = new Set((finalPairs || []).map(([r, c]) => `${r},${c}`));

  // Compare against previous step for changed cells
  const prevMatrixForDiff = prevStep?.matrix;
  // The first two steps (original, convert) change every cell, so ringing them says nothing.
  const showsChanges = phase !== 'original' && phase !== 'convert';
  const changedSet = new Set(
    prevMatrixForDiff && showsChanges ? matrixDiff(prevMatrixForDiff, matrix).map(([r, c]) => `${r},${c}`) : []
  );

  const rowLabels = matrix.map((_, i) =>
    originalRows !== undefined && i >= originalRows ? `Dummy W${i + 1}` : `W${i + 1}`
  );
  const colLabels = matrix[0].map((_, j) =>
    originalCols !== undefined && j >= originalCols ? 'Dummy' : `B${j + 1}`
  );

  const meta = PHASE_META[phase] ?? { label: phase, color: 'bg-slate-600' };
  const caption = note || stepCaption(phase, covered_rows, covered_cols, rows);

  // Sizing constants for compact display
  const CELL_SIZE = 52; // px
  const GAP_SIZE = 6;   // px
  const STEP_PITCH = CELL_SIZE + GAP_SIZE; // 58px

  // Compute row/col minimums for reduce steps
  const prevMatrixForReduce =
    prevStep?.matrix ??
    (Array.isArray(originalScores) && originalScores.length > 0 ? originalScores : matrix);
  const rowMins = prevMatrixForReduce.map((row) => Math.min(...row));
  const colMins = Array.from({ length: cols }, (_, c) =>
    Math.min(...prevMatrixForReduce.map((row) => row[c] ?? 0))
  );

  // Derive delta for adjust step if not explicitly provided
  const effectiveDelta = delta ?? (() => {
    if (phase !== 'adjust') return null;
    const uncovered = [];
    prevMatrixForReduce.forEach((row, r) => {
      if (!coveredRowSet.has(r)) {
        row.forEach((val, c) => {
          if (!coveredColSet.has(c)) uncovered.push(val);
        });
      }
    });
    return uncovered.length > 0 ? Math.min(...uncovered) : 1;
  })();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {/* ─── Compact Step Header Bar (Caption + Phase Insight) ─── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '8px', background: 'var(--panel-hover)', padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--panel-border)', fontSize: '0.82rem' }}>
        <span style={{ color: 'var(--text-bright)', fontWeight: 500 }}>{caption}</span>

        {/* Phase-specific inline insight badge */}
        {phase === 'row_reduce' && (
          <span className="badge badge-accent">
            Minima subtracted per row
          </span>
        )}
        {phase === 'col_reduce' && (
          <span className="badge badge-accent">
            Minima subtracted per column
          </span>
        )}
        {phase === 'cover' && (
          <span className="badge badge-warn">
            Lines: {covered_rows.length + covered_cols.length} of {rows} needed
          </span>
        )}
        {phase === 'adjust' && (
          <span className="badge" style={{ background: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid rgba(239, 71, 111, 0.3)' }}>
            Adjustment: δ = {effectiveDelta}
          </span>
        )}
        {phase === 'final' && (
          <span className="badge" style={{ background: 'var(--ok-bg)', color: 'var(--ok)', border: '1px solid rgba(6, 214, 160, 0.3)' }}>
            Optimal Zero Assignment ✓
          </span>
        )}
      </div>

      {/* ─── Compact Details Strip (for reduce and adjust steps) ─── */}
      {phase === 'row_reduce' && (
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', background: 'var(--bg-dark)', padding: '6px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--panel-border)', fontSize: '0.78rem', fontFamily: 'var(--font-mono)' }}>
          <span style={{ color: 'var(--muted)', fontWeight: 700 }}>Row Minimums:</span>
          {rowMins.map((minVal, r) => (
            <span key={r} style={{ padding: '2px 6px', borderRadius: 'var(--radius-sm)', background: 'var(--panel)', border: '1px solid var(--panel-border)', color: 'var(--text)' }}>
              {rowLabels[r]}: <strong style={{ color: minVal > 0 ? 'var(--warn)' : 'var(--muted)' }}>{minVal}</strong>
            </span>
          ))}
        </div>
      )}

      {phase === 'col_reduce' && (
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', background: 'var(--bg-dark)', padding: '6px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--panel-border)', fontSize: '0.78rem', fontFamily: 'var(--font-mono)' }}>
          <span style={{ color: 'var(--muted)', fontWeight: 700 }}>Col Minimums:</span>
          {colMins.map((minVal, c) => (
            <span key={c} style={{ padding: '2px 6px', borderRadius: 'var(--radius-sm)', background: 'var(--panel)', border: '1px solid var(--panel-border)', color: 'var(--text)' }}>
              {colLabels[c]}: <strong style={{ color: minVal > 0 ? 'var(--accent)' : 'var(--muted)' }}>{minVal}</strong>
            </span>
          ))}
        </div>
      )}

      {phase === 'adjust' && (
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px', background: 'var(--bg-dark)', padding: '6px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--panel-border)', fontSize: '0.78rem' }}>
          <span style={{ color: 'var(--danger)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>Matrix Adjustment Rules:</span>
          <span style={{ color: 'var(--text)' }}>1. Uncovered cells: <strong style={{ color: 'var(--warn)' }}>− {effectiveDelta}</strong></span>
          <span style={{ color: 'var(--text)' }}>2. Intersection cells: <strong style={{ color: 'var(--accent)' }}>+ {effectiveDelta}</strong></span>
          <span style={{ color: 'var(--muted)' }}>3. Singly-covered cells: <strong>unchanged</strong></span>
        </div>
      )}

      {/* ─── Compact Matrix Container ─── */}
      <div style={{ background: 'var(--card-bg)', borderRadius: 'var(--radius-md)', padding: '12px', border: '1px solid var(--panel-border)', overflowX: 'auto' }}>
        <div style={{ display: 'inline-block', position: 'relative' }}>
          {/* Column Headers */}
          <div style={{ display: 'flex', alignItems: 'center', gap: `${GAP_SIZE}px`, marginBottom: '6px', paddingLeft: '52px' }}>
            {matrix[0].map((_, c) => (
              <div
                key={c}
                style={{
                  width: `${CELL_SIZE}px`,
                  textAlign: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  fontFamily: 'var(--font-mono)',
                  color: coveredColSet.has(c) ? 'var(--accent)' : 'var(--muted)',
                }}
              >
                {colLabels[c]}
              </div>
            ))}
          </div>

          {/* Matrix Rows with Row Labels */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: `${GAP_SIZE}px` }}>
            {matrix.map((row, r) => (
              <div key={r} style={{ display: 'flex', alignItems: 'center', gap: `${GAP_SIZE}px` }}>
                {/* Row Header Label */}
                <div
                  style={{
                    width: '46px',
                    textAlign: 'right',
                    paddingRight: '6px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    fontFamily: 'var(--font-mono)',
                    color: coveredRowSet.has(r) ? 'var(--warn)' : 'var(--muted)',
                  }}
                >
                  {rowLabels[r]}
                </div>

                {/* Cells in Row */}
                {row.map((val, c) => {
                  const key = `${r},${c}`;
                  const isZero = val === 0 && phase !== 'original';
                  const isChosen = finalSet.has(key);
                  const isChanged = changedSet.has(key);
                  const isRowCovered = coveredRowSet.has(r);
                  const isColCovered = coveredColSet.has(c);
                  const isIntersection = isRowCovered && isColCovered;
                  const isDummy =
                    (originalRows !== undefined && r >= originalRows) ||
                    (originalCols !== undefined && c >= originalCols) ||
                    (step.dummy_rows || []).includes(r) ||
                    (step.dummy_cols || []).includes(c);

                  let cellBg = 'var(--panel)';
                  let cellBorder = 'var(--panel-border)';
                  let cellColor = 'var(--text)';
                  let cellWeight = 'normal';

                  if (isChosen) {
                    cellBg = 'var(--ok-bg)';
                    cellBorder = 'var(--ok)';
                    cellColor = 'var(--ok)';
                    cellWeight = '800';
                  } else if (phase === 'cover' || phase === 'adjust') {
                    if (isIntersection) {
                      cellBg = 'rgba(76, 201, 240, 0.2)';
                      cellBorder = 'var(--accent)';
                      cellColor = 'var(--accent)';
                      cellWeight = '700';
                    } else if (isRowCovered) {
                      cellBg = 'var(--warn-bg)';
                      cellBorder = 'rgba(255, 209, 102, 0.5)';
                      cellColor = 'var(--warn)';
                    } else if (isColCovered) {
                      cellBg = 'rgba(76, 201, 240, 0.15)';
                      cellBorder = 'rgba(76, 201, 240, 0.5)';
                      cellColor = 'var(--accent)';
                    } else if (isDummy) {
                      cellBg = 'var(--bg-dark)';
                      cellBorder = 'var(--panel-border)';
                      cellColor = 'var(--muted)';
                    } else if (isZero) {
                      cellBg = 'rgba(76, 201, 240, 0.15)';
                      cellBorder = 'rgba(76, 201, 240, 0.4)';
                      cellColor = 'var(--accent)';
                      cellWeight = '700';
                    }
                  } else if (isDummy) {
                    cellBg = 'var(--bg-dark)';
                    cellBorder = 'var(--panel-border)';
                    cellColor = 'var(--muted)';
                  } else if (isZero) {
                    cellBg = 'rgba(76, 201, 240, 0.15)';
                    cellBorder = 'rgba(76, 201, 240, 0.4)';
                    cellColor = 'var(--accent)';
                    cellWeight = '700';
                  }

                  const cellStyle = {
                    width: `${CELL_SIZE}px`,
                    height: `${CELL_SIZE}px`,
                    position: 'relative',
                    borderRadius: 'var(--radius-sm)',
                    border: `1px solid ${cellBorder}`,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.88rem',
                    fontFamily: 'var(--font-mono)',
                    userSelect: 'none',
                    background: cellBg,
                    boxShadow: isChanged && !isChosen ? 'inset 0 0 0 1px var(--warn)' : 'none',
                  };

                  return (
                    <div
                      key={c}
                      style={cellStyle}
                      className={`step-matrix-cell ${isChanged && !isChosen ? 'ring-orange-400 is-changed' : ''}`}
                    >
                      <span style={{ fontWeight: cellWeight, color: cellColor }}>{val}</span>

                      {/* Chosen match checkmark */}
                      {isChosen && (
                        <span
                          style={{
                            position: 'absolute',
                            top: '-4px',
                            right: '-4px',
                            background: 'var(--ok)',
                            color: 'var(--bg-dark)',
                            fontSize: '9px',
                            fontWeight: 900,
                            width: '16px',
                            height: '16px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          ✓
                        </span>
                      )}

                      {/* Small badge for zero candidates */}
                      {isZero && !isChosen && (
                        <span style={{ fontSize: '8px', fontWeight: 900, textTransform: 'uppercase', color: 'var(--accent)', marginTop: '2px', lineHeight: 1 }}>
                          zero
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* ─── Laser Outline Overlays for Line Cover (compact) ─── */}
          {phase === 'cover' && (
            <>
              {covered_rows.map((r) => (
                <div
                  key={`r-line-${r}`}
                  style={{
                    position: 'absolute',
                    pointerEvents: 'none',
                    borderRadius: 'var(--radius-sm)',
                    border: '2px solid var(--warn)',
                    background: 'rgba(255, 209, 102, 0.15)',
                    boxShadow: '0 0 10px rgba(255, 209, 102, 0.3)',
                    left: '52px',
                    width: `calc(${cols} * ${CELL_SIZE}px + (${cols} - 1) * ${GAP_SIZE}px + 4px)`,
                    top: `${26 + r * STEP_PITCH - 2}px`,
                    height: `${CELL_SIZE + 4}px`,
                  }}
                />
              ))}

              {covered_cols.map((c) => (
                <div
                  key={`c-line-${c}`}
                  style={{
                    position: 'absolute',
                    pointerEvents: 'none',
                    borderRadius: 'var(--radius-sm)',
                    border: '2px solid var(--accent)',
                    background: 'rgba(76, 201, 240, 0.15)',
                    boxShadow: '0 0 10px var(--accent-glow)',
                    left: `${52 + c * STEP_PITCH - 2}px`,
                    width: `${CELL_SIZE + 4}px`,
                    top: '24px',
                    height: `calc(${rows} * ${CELL_SIZE}px + (${rows} - 1) * ${GAP_SIZE}px + 4px)`,
                  }}
                />
              ))}
            </>
          )}
        </div>

        {/* ─── Compact Legend Bar ─── */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '14px', paddingTop: '10px', marginTop: '10px', borderTop: '1px solid var(--panel-border)', fontSize: '0.75rem', color: 'var(--muted)' }}>
          {phase === 'final' && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '14px', height: '14px', borderRadius: '3px', background: 'var(--ok-bg)', border: '1px solid var(--ok)', color: 'var(--ok)', fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px' }}>✓</span>
              <span style={{ color: 'var(--ok)', fontWeight: 600 }}>Optimal Assignment</span>
            </span>
          )}

          {(phase === 'cover' || phase === 'adjust') && (
            <>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'var(--warn-bg)', border: '2px solid var(--warn)' }} />
                <span style={{ color: 'var(--warn)' }}>Row Cover</span>
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'rgba(76, 201, 240, 0.2)', border: '2px solid var(--accent)' }} />
                <span style={{ color: 'var(--accent)' }}>Col Cover</span>
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'rgba(76, 201, 240, 0.4)', border: '1px solid var(--accent)' }} />
                <span style={{ color: 'var(--text-bright)' }}>Intersection (+δ)</span>
              </span>
            </>
          )}

          {phase !== 'original' && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'rgba(76, 201, 240, 0.15)', border: '1px solid var(--accent)' }} />
              <span style={{ color: 'var(--accent)' }}>Zero Cell</span>
            </span>
          )}

          {(rows > (originalRows ?? rows) || cols > (originalCols ?? cols)) && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '3px', border: '1px dashed var(--panel-border)', background: 'var(--bg-dark)' }} />
              <span>Dummy (padding)</span>
            </span>
          )}

          {showsChanges && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '3px', border: '1px solid var(--warn)' }} />
              <span style={{ color: 'var(--warn)' }}>Changed Cell</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
