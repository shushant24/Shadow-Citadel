// stepCaptions.js
// Returns a human-readable caption for each algorithm phase.

export function stepCaption(phase, coveredRows = [], coveredCols = [], n = 0) {
  const lines = coveredRows.length + coveredCols.length;
  switch (phase) {
    case 'original':
      return 'Original matrix: the score of each weapon against each boss.';
    case 'convert':
      return 'Converting to minimisation: subtract each score from P_max (the highest score in the matrix).';
    case 'row_reduce':
      return 'Row reduction: subtract the smallest value in each row from all cells in that row.';
    case 'col_reduce':
      return 'Column reduction: subtract the smallest value in each column from all cells in that column.';
    case 'cover':
      return lines >= n
        ? `Line covering: ${lines} line(s) cover all zeros — optimal assignment found!`
        : `Line covering: ${lines} line(s) drawn (need ${n} to stop). Matrix needs adjustment.`;
    case 'adjust':
      return 'Adjustment: subtract the smallest uncovered value from uncovered cells; add it to doubly-covered cells.';
    case 'final':
      return 'Final assignment: select zeros that give the optimal one-to-one matching.';
    default:
      return phase;
  }
}

export const PHASE_META = {
  original:   { label: 'Original',       color: 'bg-slate-600'  },
  convert:    { label: 'Convert',        color: 'bg-purple-600' },
  row_reduce: { label: 'Row Reduction',  color: 'bg-blue-600'   },
  col_reduce: { label: 'Col Reduction',  color: 'bg-cyan-600'   },
  cover:      { label: 'Line Cover',     color: 'bg-orange-500' },
  adjust:     { label: 'Adjust',         color: 'bg-red-600'    },
  final:      { label: 'Final',          color: 'bg-green-600'  },
};
