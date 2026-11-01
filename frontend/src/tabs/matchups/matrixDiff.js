// matrixDiff.js — Detects which cells changed value between two matrices
export function matrixDiff(prev, curr) {
  if (!prev || !curr) return [];
  const changed = [];
  for (let r = 0; r < curr.length; r++) {
    for (let c = 0; c < (curr[r]?.length ?? 0); c++) {
      if (prev[r]?.[c] !== curr[r][c]) {
        changed.push([r, c]);
      }
    }
  }
  return changed;
}
