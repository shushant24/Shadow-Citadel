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
    <div className="steps-replay-box">
      {/* Toggle header */}
      <button
        type="button"
        onClick={onToggle}
        className="steps-replay-toggle"
        aria-expanded={show}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>🔍</span>
          <span>Step-by-Step Replay</span>
          <span style={{ fontSize: '0.78rem', color: 'var(--muted)', fontWeight: 'normal' }}>
            ({displaySteps.length} steps)
          </span>
        </span>
        <span style={{ color: 'var(--accent)', fontSize: '0.82rem', fontWeight: 700 }}>
          {show ? '▲ Hide Steps' : '▼ View Steps'}
        </span>
      </button>

      {show && (
        <div style={{ padding: '12px' }}>
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

