// validateScores.js
// Validates a 2D score matrix before sending to the API.
// Rules: integers 0–999, no blanks, 1–8 rows and cols.
// Returns { valid: bool, errors: [[row, col]] }

export function validateScores(matrix) {
  const errors = [];
  const n = matrix.length;
  const m = matrix[0]?.length ?? 0;

  if (n < 1 || n > 8 || m < 1 || m > 8) {
    return { valid: false, errors: [] };
  }

  for (let r = 0; r < n; r++) {
    for (let c = 0; c < m; c++) {
      const val = matrix[r][c];
      const num = Number(val);
      if (
        val === '' ||
        val === null ||
        val === undefined ||
        !Number.isInteger(num) ||
        num < 0 ||
        num > 999
      ) {
        errors.push([r, c]);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
