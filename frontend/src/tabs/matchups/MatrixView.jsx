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
    <div className="space-y-3">
      {/* ─── Compact Step Header Bar (Caption + Phase Insight, avoiding duplicate phase badge) ─── */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-[var(--panel-hover,#1e273b)] px-3.5 py-2 rounded-xl border border-[var(--panel-border,#2a3449)] shadow-sm text-xs">
        <span className="text-slate-200 font-medium">{caption}</span>

        {/* Phase-specific inline insight badge */}
        {phase === 'row_reduce' && (
          <span className="font-mono text-blue-300 bg-blue-950/60 border border-blue-500/40 px-2 py-0.5 rounded-md">
            Minima subtracted per row
          </span>
        )}
        {phase === 'col_reduce' && (
          <span className="font-mono text-cyan-300 bg-cyan-950/60 border border-cyan-500/40 px-2 py-0.5 rounded-md">
            Minima subtracted per column
          </span>
        )}
        {phase === 'cover' && (
          <span className="font-mono text-[var(--warn,#ffd166)] bg-amber-950/40 border border-amber-500/40 px-2 py-0.5 rounded-md">
            Lines: {covered_rows.length + covered_cols.length} of {rows} needed
          </span>
        )}
        {phase === 'adjust' && (
          <span className="font-mono text-rose-300 bg-red-950/60 border border-red-500/40 px-2 py-0.5 rounded-md">
            Adjustment: δ = {effectiveDelta}
          </span>
        )}
        {phase === 'final' && (
          <span className="font-mono text-emerald-300 bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5 rounded-md">
            Optimal Zero Assignment ✓
          </span>
        )}
      </div>

      {/* ─── Compact Details Strip (for reduce and adjust steps) ─── */}
      {phase === 'row_reduce' && (
        <div className="flex flex-wrap items-center gap-2 bg-slate-900/60 px-3 py-1.5 rounded-lg border border-slate-800 text-[11px] font-mono">
          <span className="text-slate-400 font-bold">Row Minimums:</span>
          {rowMins.map((minVal, r) => (
            <span key={r} className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">
              {rowLabels[r]}: <strong className={minVal > 0 ? 'text-[var(--warn,#ffd166)] font-bold' : 'text-slate-400'}>{minVal}</strong>
            </span>
          ))}
        </div>
      )}

      {phase === 'col_reduce' && (
        <div className="flex flex-wrap items-center gap-2 bg-slate-900/60 px-3 py-1.5 rounded-lg border border-slate-800 text-[11px] font-mono">
          <span className="text-slate-400 font-bold">Col Minimums:</span>
          {colMins.map((minVal, c) => (
            <span key={c} className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">
              {colLabels[c]}: <strong className={minVal > 0 ? 'text-cyan-300 font-bold' : 'text-slate-400'}>{minVal}</strong>
            </span>
          ))}
        </div>
      )}

      {phase === 'adjust' && (
        <div className="flex flex-wrap items-center gap-3 bg-red-950/20 px-3 py-1.5 rounded-lg border border-red-500/30 text-[11px]">
          <span className="text-rose-300 font-bold font-mono">Matrix Adjustment Rules:</span>
          <span className="text-slate-300">1. Uncovered cells: <strong className="text-[var(--warn,#ffd166)]">− {effectiveDelta}</strong></span>
          <span className="text-slate-300">2. Intersection cells: <strong className="text-purple-300">+ {effectiveDelta}</strong></span>
          <span className="text-slate-300">3. Singly-covered cells: <strong className="text-slate-400">unchanged</strong></span>
        </div>
      )}

      {/* ─── Compact Matrix Container ─── */}
      <div className="bg-slate-900/90 rounded-xl p-3 border border-slate-800 shadow-md overflow-x-auto">
        <div className="inline-block relative">
          {/* Column Headers */}
          <div className="flex items-center gap-1.5 mb-1.5 pl-14">
            {matrix[0].map((_, c) => (
              <div
                key={c}
                style={{ width: `${CELL_SIZE}px` }}
                className={`text-center text-xs font-bold font-mono ${
                  coveredColSet.has(c) ? 'text-cyan-400' : 'text-slate-400'
                }`}
              >
                {colLabels[c]}
              </div>
            ))}
          </div>

          {/* Matrix Rows with Row Labels */}
          <div className="flex flex-col gap-1.5">
            {matrix.map((row, r) => (
              <div key={r} className="flex items-center gap-1.5">
                {/* Row Header Label */}
                <div
                  className={`w-12 text-right pr-2 text-xs font-bold font-mono ${
                    coveredRowSet.has(r) ? 'text-[var(--warn,#ffd166)]' : 'text-slate-400'
                  }`}
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
                  const isCovered = isRowCovered || isColCovered;
                  const isDummy =
                    (originalRows !== undefined && r >= originalRows) ||
                    (originalCols !== undefined && c >= originalCols) ||
                    (step.dummy_rows || []).includes(r) ||
                    (step.dummy_cols || []).includes(c);

                  // Priority for cell styling: chosen -> intersection -> covered -> dummy -> changed -> zero -> normal
                  let cellBg = 'bg-slate-800/90';
                  let cellBorder = 'border-slate-700';
                  let cellText = 'text-slate-200';

                  if (isChosen) {
                    cellBg = 'bg-emerald-950/80';
                    cellBorder = 'border-emerald-400 ring-2 ring-emerald-400';
                    cellText = 'text-emerald-200 font-extrabold';
                  } else if (phase === 'cover' || phase === 'adjust') {
                    if (isIntersection) {
                      cellBg = 'bg-purple-950/70';
                      cellBorder = 'border-purple-400';
                      cellText = 'text-purple-200 font-bold';
                    } else if (isRowCovered) {
                      cellBg = 'bg-amber-950/40';
                      cellBorder = 'border-amber-500/70';
                      cellText = 'text-amber-200 font-medium';
                    } else if (isColCovered) {
                      cellBg = 'bg-cyan-950/40';
                      cellBorder = 'border-cyan-500/70';
                      cellText = 'text-cyan-200 font-medium';
                    } else if (isDummy) {
                      cellBg = 'bg-[repeating-linear-gradient(45deg,#1e293b,#1e293b_6px,#0f172a_6px,#0f172a_12px)] opacity-75';
                      cellBorder = 'border-dashed border-slate-600';
                      cellText = 'text-slate-400 italic';
                    } else if (isZero) {
                      cellBg = 'bg-blue-950/40';
                      cellBorder = 'border-blue-400';
                      cellText = 'text-blue-300 font-bold';
                    } else {
                      // Uncovered non-zero cell
                      cellBg = 'bg-slate-800/80';
                      cellBorder = 'border-slate-700';
                      cellText = 'text-slate-300';
                    }
                  } else if (isDummy) {
                    cellBg = 'bg-[repeating-linear-gradient(45deg,#1e293b,#1e293b_6px,#0f172a_6px,#0f172a_12px)] opacity-75';
                    cellBorder = 'border-dashed border-slate-600';
                    cellText = 'text-slate-400 italic';
                  } else if (isZero) {
                    cellBg = 'bg-blue-950/50';
                    cellBorder = 'border-blue-500/70';
                    cellText = 'text-blue-300 font-bold';
                  }

                  // Changed cells receive the orange outline ring (as documented in report)
                  const changedRing = isChanged && !isChosen ? 'ring-2 ring-orange-400 border-orange-400' : '';

                  return (
                    <div
                      key={c}
                      style={{ width: `${CELL_SIZE}px`, height: `${CELL_SIZE}px` }}
                      className={`relative rounded-lg border flex flex-col items-center justify-center text-sm font-mono select-none transition-all ${cellBg} ${cellBorder} ${changedRing}`}
                    >
                      <span className={`font-bold ${cellText}`}>{val}</span>

                      {/* Chosen match checkmark */}
                      {isChosen && (
                        <span className="absolute -top-1 -right-1 bg-emerald-500 text-slate-950 text-[9px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center">
                          ✓
                        </span>
                      )}

                      {/* Small badge for zero candidates */}
                      {isZero && !isChosen && (
                        <span className="text-[8px] font-black uppercase text-blue-400 mt-0.5 leading-none">
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
                  className="absolute pointer-events-none rounded-lg border-2 border-amber-400 bg-amber-500/10 shadow-[0_0_10px_rgba(245,158,11,0.25)]"
                  style={{
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
                  className="absolute pointer-events-none rounded-lg border-2 border-cyan-400 bg-cyan-500/10 shadow-[0_0_10px_rgba(6,182,212,0.25)]"
                  style={{
                    left: `${54 + c * STEP_PITCH - 2}px`,
                    width: `${CELL_SIZE + 4}px`,
                    top: '24px',
                    height: `calc(${rows} * ${CELL_SIZE}px + (${rows} - 1) * ${GAP_SIZE}px + 4px)`,
                  }}
                />
              ))}
            </>
          )}
        </div>

        {/* ─── Compact Legend Bar (including hatched dummy representation) ─── */}
        <div className="flex flex-wrap items-center justify-start gap-4 pt-2.5 mt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
          {phase === 'final' && (
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-emerald-500/30 border border-emerald-400 text-emerald-300 font-bold flex items-center justify-center text-[9px]">✓</span>
              <span className="text-emerald-300 font-medium">Optimal Assignment</span>
            </span>
          )}

          {(phase === 'cover' || phase === 'adjust') && (
            <>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-amber-500/20 border-2 border-amber-400" />
                <span className="text-amber-300 font-medium">Row Cover (Amber)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-cyan-500/20 border-2 border-cyan-400" />
                <span className="text-cyan-300 font-medium">Col Cover (Cyan)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-purple-950 border border-purple-400" />
                <span className="text-purple-300 font-medium">Intersection (+δ)</span>
              </span>
            </>
          )}

          {phase !== 'original' && (
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-blue-950/60 border border-blue-400" />
              <span className="text-blue-300 font-medium">Zero Cell</span>
            </span>
          )}

          {(rows > (originalRows ?? rows) || cols > (originalCols ?? cols)) && (
            <span className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded border border-dashed border-slate-600 bg-[repeating-linear-gradient(45deg,#334155,#334155_3px,#1e293b_3px,#1e293b_6px)]" />
              <span className="text-slate-400 font-medium">Dummy (padding)</span>
            </span>
          )}

          {showsChanges && (
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded border-2 border-orange-400 ring-1 ring-orange-400" />
              <span className="text-orange-300 font-medium">Changed Cell</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
