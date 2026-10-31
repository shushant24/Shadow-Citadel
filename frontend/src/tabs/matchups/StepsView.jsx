// StepsView.jsx — View Steps / Hide Steps toggle wrapper for Shadow Citadel.
// Integrated with Part 6's shared StepPlayer.
// Adds an 'Original matrix' step before the convert step; scrubber and note are hidden for compact playback.

import React, { useMemo } from 'react';
import StepPlayer from '../../components/StepPlayer';
import MatrixView from './MatrixView';

// Plain-language caption for the two opening steps.
function openingNotes({ maximize, originalScores, originalRows, originalCols }) {
  const flat = (originalScores ?? []).flat().filter(Number.isFinite);
  const pMax = flat.length ? Math.max(...flat) : null;
  const original = maximize
    ? 'Original matrix: the damage each weapon deals to each boss. Higher is better.'
    : 'Original matrix: the cost of each weapon against each boss. Lower is better.';
  let convert = maximize
    ? `Subtract every score from the largest score${pMax !== null ? ` (P_max = ${pMax})` : ''}. The biggest damage becomes 0, so maximizing damage turns into minimizing cost.`
    : 'Minimize mode: the scores are already costs, so they are used as they are.';
  if (Number.isInteger(originalRows) && Number.isInteger(originalCols) && originalRows !== originalCols) {
    convert += ` A Dummy ${originalRows > originalCols ? 'column' : 'row'} of zeros pads the grid to a square.`;
  }
  return { original, convert };
}

export default function StepsView({
  steps = [],
  answer,
  originalRows,
  originalCols,
  originalScores,
  maximize = true,
  show,
  onToggle,
}) {
  const finalPairs = answer?.pairsInfo?.map((p) => [p.row, p.col]) ?? [];

  // Two opening steps come before the algorithm's own steps: the original matrix,
  // then the converted one (maximize: P_max minus each score).
  const notes = openingNotes({ maximize, originalScores, originalRows, originalCols });

  const displaySteps = useMemo(() => {
    const trace = steps || [];
    const hasOriginal = Array.isArray(originalScores) && originalScores.length > 0;
    const first = hasOriginal
      ? [{ phase: 'original', matrix: originalScores, covered_rows: [], covered_cols: [], dummy_rows: [], dummy_cols: [], note: notes.original }]
      : [];
    const all = [...first, ...trace.map((step) => (step.phase === 'convert' ? { ...step, note: notes.convert } : step))];
    return all.map((step, i) => ({ ...step, prevStep: all[i - 1] ?? null }));
  }, [steps, originalScores, notes.original, notes.convert]);

  return (
    <div className="bg-[var(--panel,#171e2e)] rounded-xl shadow-lg overflow-hidden border border-[var(--panel-border,#2a3449)]">
      {/* Toggle header */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-slate-700/30 transition cursor-pointer"
        aria-expanded={show}
      >
        <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
          <span>🔍</span>
          <span>Step-by-Step Replay</span>
          <span className="text-[11px] text-slate-400 font-normal">({displaySteps.length} steps)</span>
        </span>
        <span className="text-[var(--accent,#4cc9f0)] text-xs font-bold">{show ? '▲ Hide Steps' : '▼ View Steps'}</span>
      </button>

      {show && (
        <div className="px-2 sm:px-4 pb-4 pt-1 [&_.step-controls]:flex-wrap [&_.btn-group]:flex-wrap [&_.speed-control]:flex-wrap [&_.speed-control]:gap-y-1">
          <StepPlayer steps={displaySteps} showScrubber={false} showNote={false}>
            {(step) => (
              <MatrixView
                step={step}
                prevStep={step.prevStep}
                finalPairs={step.phase === 'final' ? finalPairs : []}
                originalRows={originalRows}
                originalCols={originalCols}
                originalScores={originalScores}
                maximize={maximize}
              />
            )}
          </StepPlayer>
        </div>
      )}
    </div>
  );
}

