// normalizeAssign.js
// Converts backend/fixture response to internal 0-based format.
// Handles both n > m (benched weapons) and n < m (unassigned bosses).
// Normalizes 1-based contract indices to 0-based for UI rendering.

function toZeroBased(list = []) {
  if (!Array.isArray(list) || list.length === 0) return [];
  // If 0 is present, the array is already 0-based (legacy test/mock)
  const isZeroBased = list.some((val) => val === 0);
  return isZeroBased ? [...list] : list.map((val) => val - 1);
}

export function normalizeAssign(raw, originalRows, originalCols) {
  if (!raw || !raw.answer) return raw;

  const rawPairs = raw.answer.pairs || [];
  const rawTotal = raw.answer.total ?? 0;

  // Unassigned rows/cols from backend contract (1-based -> 0-based)
  const unassignedRows = toZeroBased(raw.answer.unassigned?.rows || []);
  const unassignedCols = toZeroBased(raw.answer.unassigned?.cols || []);

  const isBenchedCol = (col) => col === null || col === undefined || (originalCols !== undefined && col >= originalCols);
  const isDummyRow = (row) => originalRows !== undefined && row >= originalRows;

  // Build a map of real weapon pairings (0 .. originalRows - 1)
  const weaponMap = new Map();

  // 1. Process explicit pairs, skipping dummy rows (which represent padded dummy weapons)
  for (const [w, b] of rawPairs) {
    const row = w - 1;
    const col = b - 1;
    if (!isDummyRow(row)) {
      weaponMap.set(row, {
        row,
        col: isBenchedCol(col) ? null : col,
        benched: isBenchedCol(col),
      });
    }
  }

  // 2. Add unassigned weapons reported by Part 3 backend (n > m case)
  for (const row of unassignedRows) {
    if (!isDummyRow(row) && (!weaponMap.has(row) || weaponMap.get(row).benched)) {
      weaponMap.set(row, {
        row,
        col: null,
        benched: true,
      });
    }
  }

  // 3. Fallback: inspect final step 'selected' zeros for padded matches
  const finalStep = (raw.steps || []).find((s) => s.phase === 'final' && Array.isArray(s.selected));
  if (finalStep) {
    for (const [w, b] of finalStep.selected) {
      const row = w - 1;
      const col = b - 1;
      if (!isDummyRow(row)) {
        if (!weaponMap.has(row) || isBenchedCol(col)) {
          weaponMap.set(row, {
            row,
            col: isBenchedCol(col) ? null : col,
            benched: isBenchedCol(col),
          });
        }
      }
    }
  }

  // Ensure every real weapon from 0 to originalRows - 1 is represented
  if (originalRows !== undefined) {
    for (let r = 0; r < originalRows; r++) {
      if (!weaponMap.has(r)) {
        weaponMap.set(r, {
          row: r,
          col: null,
          benched: true,
        });
      }
    }
  }

  const pairsInfo = Array.from(weaponMap.values()).sort((a, b) => a.row - b.row);

  // Standardize pairs to 0-based, omitting dummy rows
  const realPairs = rawPairs
    .map(([w, b]) => [w - 1, b - 1])
    .filter(([r, c]) => !isDummyRow(r) && !isBenchedCol(c));

  const steps = (raw.steps || []).map((step) => ({
    ...step,
    covered_rows: toZeroBased(step.covered_rows),
    covered_cols: toZeroBased(step.covered_cols),
    dummy_rows: toZeroBased(step.dummy_rows),
    dummy_cols: toZeroBased(step.dummy_cols),
  }));

  return {
    status: raw.status,
    answer: {
      ...raw.answer,
      total: rawTotal,
      pairs: realPairs,
      pairsInfo,
      unassigned: {
        rows: unassignedRows.filter((r) => !isDummyRow(r)),
        cols: unassignedCols.filter((c) => !isBenchedCol(c)),
      },
    },
    steps,
  };
}
