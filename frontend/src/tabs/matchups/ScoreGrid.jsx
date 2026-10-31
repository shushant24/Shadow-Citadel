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
    <div className="bg-[var(--panel,#171e2e)] border border-[var(--panel-border,#2a3449)] rounded-xl p-4 shadow-lg space-y-3">
      {/* Controls bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Preset dropdown */}
          <select
            value={preset}
            onChange={(e) => handlePreset(e.target.value)}
            className="bg-slate-700/80 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 border border-slate-600 focus:ring-2 focus:ring-[var(--accent,#4cc9f0)] focus:outline-none"
          >
            {Object.entries(PRESETS).map(([key, { label }]) => (
              <option key={key} value={key}>{label}</option>
            ))}
            {preset === 'custom' && <option value="custom">Custom (Edited)</option>}
          </select>

          {/* Maximize toggle */}
          <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer select-none bg-slate-700/50 px-2 py-1 rounded-lg hover:bg-slate-700/80 transition">
            <input
              type="checkbox"
              checked={maximize}
              onChange={(e) => {
                setMaximize(e.target.checked);
                notifyEdit(matrix);
              }}
              className="w-3.5 h-3.5 accent-[var(--accent,#4cc9f0)]"
            />
            <span className="font-medium">Maximize</span>
          </label>

          {/* Size controls */}
          <div className="flex items-center gap-1 text-xs text-slate-400 bg-slate-700/50 px-2 py-1 rounded-lg">
            <span>Rows:</span>
            <button type="button" onClick={removeRow} disabled={rows <= 1} className="w-5 h-5 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-30 flex items-center justify-center font-bold text-slate-200 cursor-pointer">−</button>
            <span className="w-4 text-center text-slate-200 font-bold">{rows}</span>
            <button type="button" onClick={addRow} disabled={rows >= 8} className="w-5 h-5 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-30 flex items-center justify-center font-bold text-slate-200 cursor-pointer">+</button>
          </div>
          <div className="flex items-center gap-1 text-xs text-slate-400 bg-slate-700/50 px-2 py-1 rounded-lg">
            <span>Cols:</span>
            <button type="button" onClick={removeCol} disabled={cols <= 1} className="w-5 h-5 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-30 flex items-center justify-center font-bold text-slate-200 cursor-pointer">−</button>
            <span className="w-4 text-center text-slate-200 font-bold">{cols}</span>
            <button type="button" onClick={addCol} disabled={cols >= 8} className="w-5 h-5 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-30 flex items-center justify-center font-bold text-slate-200 cursor-pointer">+</button>
          </div>
        </div>

        {/* Reset button */}
        <button
          type="button"
          onClick={handleReset}
          className="text-xs text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 px-2.5 py-1.5 rounded-lg transition cursor-pointer"
          title="Reset to default preset"
        >
          ↺ Reset
        </button>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto">
        <table className="border-collapse">
          <thead>
            <tr>
              <th className="w-12 h-6 text-[11px] font-normal text-slate-500"></th>
              {Array.from({ length: cols }, (_, c) => (
                <th key={c} className="w-14 h-6 text-[11px] font-semibold text-slate-400 text-center font-mono">
                  B{c + 1}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.map((row, r) => (
              <tr key={r}>
                <td className="w-12 h-10 text-[11px] font-semibold text-slate-400 text-right pr-2 font-mono">
                  W{r + 1}
                </td>
                {row.map((val, c) => (
                  <td key={c} className="p-0.5">
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
        <p className="text-xs text-red-400 font-medium">
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
          className="w-full py-2.5 px-4 rounded-lg font-bold text-xs uppercase tracking-wide bg-[var(--accent,#4cc9f0)] hover:bg-[var(--accent-hover,#3ab0d6)] text-slate-950 disabled:opacity-40 disabled:hover:bg-[var(--accent,#4cc9f0)] transition cursor-pointer shadow-md"
        >
          {loading ? 'Solving Hungarian Reductions…' : 'Solve'}
        </button>
      </div>
    </div>
  );
}
