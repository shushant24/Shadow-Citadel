// ScoreGrid.jsx — Editable n×m score matrix with labels, validation,
// preset dropdown, size controls, maximize toggle, keyboard Enter solve,
// and integration with Shadow Citadel theme variables.

import React, { useEffect, useState, useRef } from 'react';
import Cell from './Cell';
import { validateScores } from './validateScores';

export const DEFAULT_5x5 = [
  [82, 64, 97, 43, 96],
  [48, 40, 61, 59, 50],
  [83, 97, 81, 50, 61],
  [95, 78, 72, 60, 84],
  [69, 79, 54, 96, 66],
];

// Official Part 3 backend / fixture 4x4 adjust case (maximize, total 116)
export const PRESET_ADJUST_MAX = [
  [26, 19, 10, 12],
  [28, 34, 13, 22],
  [13, 37, 19, 22],
  [12, 40, 10, 37],
];

// Original plan 4x4 adjust case (minimize, total 17)
export const PRESET_ADJUST_MIN = [
  [6, 6, 6, 3],
  [7, 7, 8, 9],
  [7, 9, 2, 9],
  [5, 7, 4, 5],
];

export const PRESETS = {
  default:        { label: 'Default 5×5 (maximize)',   matrix: DEFAULT_5x5,                             maximize: true  },
  adjust_max:     { label: 'Part 3 Adjust 4×4 (max)',  matrix: PRESET_ADJUST_MAX,                       maximize: true  },
  adjust:         { label: 'Minimize 4×4 (adjust)',    matrix: PRESET_ADJUST_MIN,                       maximize: false },
  unbalanced:     { label: 'Unbalanced 5×4',           matrix: DEFAULT_5x5.map(r => r.slice(0, 4)),    maximize: true  },
  unbalanced_4x5: { label: 'Unbalanced 4×5',           matrix: DEFAULT_5x5.slice(0, 4),                 maximize: true  },
};

export default function ScoreGrid({
  scores: externalScores,
  initialScores,
  onSolve,
  onEdit,
  onScoresChange,
  loading,
  chosenPairs = [],
}) {
  const activeInitial = externalScores || initialScores || DEFAULT_5x5;

  // Detect which preset matches the initial matrix
  const initialPresetKey = Object.entries(PRESETS).find(
    ([_, p]) => p.maximize === true && JSON.stringify(p.matrix) === JSON.stringify(activeInitial)
  )?.[0] ?? 'default';

  const [preset, setPreset]     = useState(initialPresetKey);
  const [matrix, setMatrix]     = useState(() => activeInitial.map(r => [...r]));
  const [maximize, setMaximize] = useState(PRESETS[initialPresetKey]?.maximize ?? true);

  // Track serialized external scores to avoid setting 'custom' on initial mount
  const prevExternalRef = useRef(JSON.stringify(activeInitial));

  // Sync only when externalScores actually changes from parent after mount
  useEffect(() => {
    if (externalScores && Array.isArray(externalScores) && externalScores.length > 0) {
      const serialized = JSON.stringify(externalScores);
      if (serialized !== prevExternalRef.current) {
        prevExternalRef.current = serialized;
        setMatrix(externalScores.map(r => [...r]));
        // MatchupsTab re-solves new scenario scores in maximize mode, so the checkbox must say so too.
        setMaximize(true);
        const matchedKey = Object.entries(PRESETS).find(
          ([_, p]) => p.maximize === true && JSON.stringify(p.matrix) === serialized
        )?.[0];
        setPreset(matchedKey || 'custom');
      }
    }
  }, [externalScores]);

  const { valid, errors } = validateScores(matrix);
  const errSet = new Set(errors.map(([r, c]) => `${r},${c}`));
  const chosenSet = new Set(
    (chosenPairs || []).filter(p => !p.benched && p.col !== null && p.col !== undefined).map(p => `${p.row},${p.col}`)
  );

  const rows = matrix.length;
  const cols = matrix[0]?.length ?? 0;

  function notifyEdit(updatedMatrix) {
    if (onEdit) onEdit();
    if (onScoresChange && updatedMatrix) onScoresChange(updatedMatrix);
  }

  function handlePreset(key) {
    const selected = PRESETS[key];
    if (!selected) return;
    const next = selected.matrix.map(r => [...r]);
    setPreset(key);
    setMatrix(next);
    setMaximize(selected.maximize);
    notifyEdit(next);
  }

  function handleReset() {
    setPreset('default');
    const base = externalScores || DEFAULT_5x5;
    const next = base.map(r => [...r]);
    setMatrix(next);
    setMaximize(true);
    notifyEdit(next);
  }

  function handleCellChange(r, c, val) {
    setPreset('custom');
    const next = matrix.map(row => [...row]);
    next[r][c] = val === '' ? '' : Number(val);
    setMatrix(next);
    notifyEdit(next);
  }

  function addRow() {
    if (rows >= 8) return;
    const next = [...matrix, Array(cols).fill(0)];
    setMatrix(next);
    setPreset('custom');
    notifyEdit(next);
  }

  function removeRow() {
    if (rows <= 1) return;
    const next = matrix.slice(0, -1);
    setMatrix(next);
    setPreset('custom');
    notifyEdit(next);
  }

  function addCol() {
    if (cols >= 8) return;
    const next = matrix.map(row => [...row, 0]);
    setMatrix(next);
    setPreset('custom');
    notifyEdit(next);
  }

  function removeCol() {
    if (cols <= 1) return;
    const next = matrix.map(row => row.slice(0, -1));
    setMatrix(next);
    setPreset('custom');
    notifyEdit(next);
  }

  function handleSolve() {
    if (!valid || loading) return;
    onSolve({ scores: matrix, maximize });
  }

  return (
    <div className="stat-card" style={{ gap: '14px' }}>
      {/* Controls bar */}
      <div className="matchups-toolbar">
        <div className="toolbar-group">
          {/* Preset dropdown */}
          <select
            value={preset}
            onChange={(e) => handlePreset(e.target.value)}
            className="form-input"
            style={{ fontSize: '0.8rem', padding: '4px 10px' }}
          >
            {Object.entries(PRESETS).map(([key, { label }]) => (
              <option key={key} value={key}>{label}</option>
            ))}
            {preset === 'custom' && <option value="custom">Custom (Edited)</option>}
          </select>

          {/* Maximize toggle */}
          <label className="inline-group" style={{ fontSize: '0.82rem', cursor: 'pointer', userSelect: 'none' }}>
            <input
              type="checkbox"
              checked={maximize}
              onChange={(e) => {
                setMaximize(e.target.checked);
                notifyEdit(matrix);
              }}
              style={{ accentColor: 'var(--accent)' }}
            />
            <span style={{ fontWeight: 600 }}>Maximize</span>
          </label>

          {/* Size controls */}
          <div className="size-pill">
            <span>Rows:</span>
            <button type="button" onClick={removeRow} disabled={rows <= 1} title="Remove row">−</button>
            <span className="size-value">{rows}</span>
            <button type="button" onClick={addRow} disabled={rows >= 8} title="Add row">+</button>
          </div>
          <div className="size-pill">
            <span>Cols:</span>
            <button type="button" onClick={removeCol} disabled={cols <= 1} title="Remove column">−</button>
            <span className="size-value">{cols}</span>
            <button type="button" onClick={addCol} disabled={cols >= 8} title="Add column">+</button>
          </div>
        </div>

        {/* Reset button */}
        <button
          type="button"
          onClick={handleReset}
          className="btn btn-secondary btn-sm"
          title="Reset to default preset"
        >
          ↺ Reset
        </button>
      </div>

      {/* Grid */}
      <div className="matrix-grid-container">
        <table className="matrix-grid-table">
          <thead>
            <tr>
              <th style={{ width: '48px' }}></th>
              {Array.from({ length: cols }, (_, c) => (
                <th key={c} style={{ width: '56px' }}>
                  B{c + 1}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.map((row, r) => (
              <tr key={r}>
                <td className="row-label">
                  W{r + 1}
                </td>
                {row.map((val, c) => (
                  <td key={c}>
                    <Cell
                      value={val}
                      label={`Weapon ${r + 1} vs Boss ${c + 1}`}
                      onChange={(newVal) => handleCellChange(r, c, newVal)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSolve();
                        }
                      }}
                      isInvalid={errSet.has(`${r},${c}`)}
                      isChosen={chosenSet.has(`${r},${c}`)}
                      disabled={loading}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Validation error message */}
      {!valid && (
        <p className="error" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
          Cells must be whole numbers between 0 and 999. Fix highlighted cells to solve.
        </p>
      )}

      {/* Solve button */}
      <div>
        <button
          type="button"
          onClick={handleSolve}
          disabled={!valid || loading}
          title="Solve assignment (or press Enter)"
          className="btn btn-primary"
          style={{ width: '100%', padding: '10px 16px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}
        >
          {loading ? 'Solving Hungarian Reductions…' : 'Solve'}
        </button>
      </div>
    </div>
  );
}
