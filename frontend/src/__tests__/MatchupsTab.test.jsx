// MatchupsTab.test.jsx
// Integration and component tests for Part 8 Matchups Tab in Shadow Citadel.
// Validates: 5 chosen cells, error retry, adjust replay, unbalanced UI (5x4 and 4x5),
// stale results, normalization, validation (including decimals), matrixDiff, demo banner,
// shared scores, row minimums, final step replay, and keyboard Enter solve.

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import MatchupsTab from '../tabs/MatchupsTab.jsx';
import { normalizeAssign } from '../tabs/matchups/normalizeAssign.js';
import { matrixDiff } from '../tabs/matchups/matrixDiff.js';
import { validateScores } from '../tabs/matchups/validateScores.js';
import { computeGreedyScore } from '../tabs/matchups/ResultPanel.jsx';
import assignFixture from '@fixtures/assign.json';
import { api } from '../api.js';

// The tab no longer solves on open: the viewer presses Solve.
async function renderSolved(ui = <MatchupsTab />) {
  const utils = render(ui);
  fireEvent.click(screen.getByRole('button', { name: /^solve$/i }));
  await waitFor(() => expect(screen.getAllByText('445').length).toBeGreaterThan(0));
  return utils;
}

describe('Nothing is solved until Solve is pressed', () => {
  it('opens with the grid, a hint, no result and no green ticks', () => {
    render(<MatchupsTab />);
    expect(screen.getByLabelText(/Weapon 1 vs Boss 1/i)).toBeInTheDocument();
    expect(screen.getByTestId('solve-hint')).toBeInTheDocument();
    expect(screen.queryByText('Optimal Combat Assignment')).not.toBeInTheDocument();
    expect(screen.queryByText('445')).not.toBeInTheDocument();
    expect(screen.queryAllByText('✓').length).toBe(0);
    expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
  });

  it('Reset clears the result, keeps the Reset button, and solves again only on Solve', async () => {
    await renderSolved();
    expect(screen.queryByTestId('solve-hint')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /reset/i }));
    expect(screen.queryByText('Optimal Combat Assignment')).not.toBeInTheDocument();
    expect(screen.getByTestId('solve-hint')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^solve$/i }));
    await waitFor(() => expect(screen.getAllByText('445').length).toBeGreaterThan(0));
  });
});

describe('MatchupsTab Component', () => {
  it('renders from fixture, shows total 445, and highlights exactly 5 chosen cells', async () => {
    await renderSolved();

    await waitFor(() => {
      expect(screen.getAllByText('445').length).toBeGreaterThan(0);
    });

    // Verify all 5 bosses appear
    expect(screen.getByText('Boss 1')).toBeInTheDocument();
    expect(screen.getByText('Boss 2')).toBeInTheDocument();
    expect(screen.getByText('Boss 3')).toBeInTheDocument();
    expect(screen.getByText('Boss 4')).toBeInTheDocument();
    expect(screen.getByText('Boss 5')).toBeInTheDocument();

    // Verify exactly 5 checkmarks (✓) are rendered
    const checkmarks = screen.getAllByText('✓');
    expect(checkmarks.length).toBe(5);
  });

  it('can open steps replay using StepPlayer and navigate steps', async () => {
    await renderSolved();

    await waitFor(() => {
      expect(screen.getAllByText('445').length).toBeGreaterThan(0);
    });

    const viewStepsBtns = screen.getAllByRole('button', { name: /view steps/i });
    fireEvent.click(viewStepsBtns[0]);

    // StepPlayer is rendered with controls
    expect(await screen.findByRole('region', { name: /step player/i })).toBeInTheDocument();
    expect(screen.getByText(/Step 1 of/i)).toBeInTheDocument();

    const nextBtn = screen.getByRole('button', { name: /^next$/i });
    fireEvent.click(nextBtn);
    expect(screen.getByText(/Step 2 of/i)).toBeInTheDocument();
  });

  it('shows error banner when solve fails and retry button recovers', async () => {
    const originalAssign = api.assign;
    api.assign = vi.fn().mockRejectedValueOnce(new Error('Backend offline'));

    render(<MatchupsTab />);
    fireEvent.click(screen.getByRole('button', { name: /^solve$/i }));

    await waitFor(() => {
      expect(screen.getByText(/Failed to solve: Backend offline/i)).toBeInTheDocument();
    });

    // Clicking Retry Calculation calls solve again and recovers
    api.assign = vi.fn().mockResolvedValueOnce(assignFixture);
    const retryBtn = screen.getByRole('button', { name: /retry calculation/i });
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getAllByText('445').length).toBeGreaterThan(0);
    });
    expect(screen.queryByText(/Failed to solve/i)).not.toBeInTheDocument();

    api.assign = originalAssign;
  });

  it('clears error and stale results when user edits any score cell', async () => {
    await renderSolved();

    await waitFor(() => {
      expect(screen.getAllByText('445').length).toBeGreaterThan(0);
    });

    const firstCell = screen.getByLabelText(/Weapon 1 vs Boss 1/i);
    fireEvent.change(firstCell, { target: { value: '99' } });

    // Result panel should be cleared immediately
    expect(screen.queryByText('Optimal Combat Assignment')).not.toBeInTheDocument();
  });

  it('unbalanced UI displays Weapon 2 as Benched and shows 385 (5x4 case)', async () => {
    render(<MatchupsTab />);

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'unbalanced' } });

    const solveBtn = screen.getByRole('button', { name: /^solve$/i });
    fireEvent.click(solveBtn);

    await waitFor(() => {
      expect(screen.getAllByText('385').length).toBeGreaterThan(0);
    });

    expect(screen.getAllByText(/W2/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Benched/i).length).toBeGreaterThan(0);
  });

  it('unbalanced UI displays Boss 4 as Unassigned with total 349 (4x5 case)', async () => {
    render(<MatchupsTab />);

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'unbalanced_4x5' } });

    const solveBtn = screen.getByRole('button', { name: /^solve$/i });
    fireEvent.click(solveBtn);

    await waitFor(() => {
      expect(screen.getAllByText('349').length).toBeGreaterThan(0);
    });

    // Boss 4 is unassigned ("No Weapon")
    expect(screen.getAllByText('B4').length).toBeGreaterThan(0);
    expect(screen.getByText('No Weapon')).toBeInTheDocument();
    // No benched weapon card
    expect(screen.queryByText('W5')).not.toBeInTheDocument();
    expect(screen.queryByText('Benched')).not.toBeInTheDocument();
  });

  it('replays adjust fixture with dedicated adjust phase and delta', async () => {
    render(<MatchupsTab />);

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'adjust_max' } });

    const solveBtn = screen.getByRole('button', { name: /^solve$/i });
    fireEvent.click(solveBtn);

    await waitFor(() => {
      expect(screen.getAllByText('116').length).toBeGreaterThan(0);
    });

    const viewStepsBtns = screen.getAllByRole('button', { name: /view steps/i });
    fireEvent.click(viewStepsBtns[0]);

    // Steps: original, convert, row_reduce, col_reduce, cover, adjust, ...
    expect(screen.getByText(/Step 1 of/i)).toBeInTheDocument();

    const nextBtn = screen.getByRole('button', { name: /^next$/i });
    for (let i = 0; i < 5; i++) fireEvent.click(nextBtn); // -> step 6 (adjust)

    expect(screen.getByText(/Step 6 of/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Adjust/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Adjustment: δ =/i)).toBeInTheDocument();
  });

  it('solves Minimize 4x4 adjust preset to total cost 17', async () => {
    render(<MatchupsTab />);

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'adjust' } });

    const solveBtn = screen.getByRole('button', { name: /^solve$/i });
    fireEvent.click(solveBtn);

    await waitFor(() => {
      expect(screen.getAllByText('17').length).toBeGreaterThan(0);
    });

    expect(screen.getByText('Minimum Cost Matching')).toBeInTheDocument();
    expect(screen.getByText(/Total Cost/i)).toBeInTheDocument();
  });

  it('displays demo mode banner and hides stale results when edited in fixture mode', async () => {
    await renderSolved();

    await waitFor(() => {
      expect(screen.getAllByText('445').length).toBeGreaterThan(0);
    });

    // Edit a score cell
    const cell = screen.getByLabelText(/Weapon 1 vs Boss 1/i);
    fireEvent.change(cell, { target: { value: '77' } });

    const solveBtn = screen.getByRole('button', { name: /^solve$/i });
    fireEvent.click(solveBtn);

    await waitFor(() => {
      expect(screen.getByText(/Demo data mode:/i)).toBeInTheDocument();
    });

    // Stale result panel should NOT remain on screen
    expect(screen.queryByText('Optimal Combat Assignment')).not.toBeInTheDocument();
  });

  it('displays demo mode banner when Maximize is toggled off on default 5x5 in fixture mode', async () => {
    await renderSolved();

    await waitFor(() => {
      expect(screen.getAllByText('445').length).toBeGreaterThan(0);
    });

    // Uncheck Maximize toggle
    const maxCheckbox = screen.getByRole('checkbox', { name: /maximize/i });
    fireEvent.click(maxCheckbox);

    const solveBtn = screen.getByRole('button', { name: /^solve$/i });
    fireEvent.click(solveBtn);

    await waitFor(() => {
      expect(screen.getByText(/Demo data mode:/i)).toBeInTheDocument();
    });

    expect(screen.queryByText('Optimal Combat Assignment')).not.toBeInTheDocument();
  });

  it('accepts shared scores from scenario prop and updates reactively', async () => {
    const customScores = [
      [90, 80],
      [70, 60],
    ];
    let utils;
    await act(async () => {
      utils = render(<MatchupsTab scenario={{ weapon_boss_scores: customScores }} />);
    });

    const cellW1B1 = screen.getByLabelText(/Weapon 1 vs Boss 1/i);
    expect(cellW1B1.value).toBe('90');

    // Update from parent scenario
    const updatedScores = [
      [99, 88],
      [77, 66],
    ];
    await act(async () => {
      utils.rerender(<MatchupsTab scenario={{ weapon_boss_scores: updatedScores }} />);
    });
    expect(screen.getByLabelText(/Weapon 1 vs Boss 1/i).value).toBe('99');
  });

  it('displays correct row minimums (0, 36, 0, 2, 1) and highlights changed cells for default 5x5 maximize', async () => {
    await renderSolved();

    await waitFor(() => {
      expect(screen.getAllByText('445').length).toBeGreaterThan(0);
    });

    const viewStepsBtns = screen.getAllByRole('button', { name: /view steps/i });
    fireEvent.click(viewStepsBtns[0]);

    // Step 3 is row_reduce (after original and convert). Minimums come from the converted matrix, not raw scores.
    const next = screen.getByRole('button', { name: /^next$/i });
    fireEvent.click(next);
    fireEvent.click(next);
    expect(screen.getByText('Row Minimums:')).toBeInTheDocument();
    expect(screen.getByText(/W1:/)).toHaveTextContent('0');
    expect(screen.getByText(/W2:/)).toHaveTextContent('36');
    expect(screen.getByText(/W3:/)).toHaveTextContent('0');
    expect(screen.getByText(/W4:/)).toHaveTextContent('2');
    expect(screen.getByText(/W5:/)).toHaveTextContent('1');

    // Verify changed cells receive the orange highlight ring
    const changedCells = document.querySelectorAll('.ring-orange-400');
    expect(changedCells.length).toBeGreaterThan(0);
  });

  it('replaying to the final step highlights optimal zero assignments', async () => {
    await renderSolved();

    await waitFor(() => {
      expect(screen.getAllByText('445').length).toBeGreaterThan(0);
    });

    const viewStepsBtns = screen.getAllByRole('button', { name: /view steps/i });
    fireEvent.click(viewStepsBtns[0]);

    // Jump to the last step using Last step button
    const lastBtn = screen.getByRole('button', { name: /last step/i });
    fireEvent.click(lastBtn);

    expect(screen.getByText(/Optimal Zero Assignment/i)).toBeInTheDocument();
  });

  it('allows solving by pressing Enter on any score cell', async () => {
    await renderSolved();

    await waitFor(() => {
      expect(screen.getAllByText('445').length).toBeGreaterThan(0);
    });

    const cell = screen.getByLabelText(/Weapon 1 vs Boss 1/i);
    fireEvent.keyDown(cell, { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      expect(screen.getAllByText('445').length).toBeGreaterThan(0);
    });
  });
});

describe('matrixDiff utility', () => {
  it('returns empty array when matrices are identical or empty', () => {
    const m = [[1, 2], [3, 4]];
    expect(matrixDiff(m, m)).toEqual([]);
    expect(matrixDiff(null, m)).toEqual([]);
    expect(matrixDiff(m, null)).toEqual([]);
  });

  it('detects coordinates of changed cells accurately', () => {
    const prev = [
      [10, 20],
      [30, 40],
    ];
    const curr = [
      [10, 25],
      [30, 42],
    ];
    const diffs = matrixDiff(prev, curr);
    expect(diffs).toEqual([[0, 1], [1, 1]]);
  });
});

describe('computeGreedyScore utility', () => {
  it('computes 414 for default 5x5 maximization', () => {
    const m = [
      [82, 64, 97, 43, 96],
      [48, 40, 61, 59, 50],
      [83, 97, 81, 50, 61],
      [95, 78, 72, 60, 84],
      [69, 79, 54, 96, 66],
    ];
    expect(computeGreedyScore(m, true)).toBe(414);
  });

  it('handles null or empty matrix gracefully', () => {
    expect(computeGreedyScore(null)).toBeNull();
    expect(computeGreedyScore([])).toBeNull();
  });
});

describe('normalizeAssign utility', () => {
  it('converts 1-based pairs and covered lists to 0-based', () => {
    const raw = {
      status: 'optimal',
      answer: { pairs: [[1, 5], [2, 3]], total: 157 },
      steps: [
        {
          phase: 'cover',
          covered_rows: [1, 5],
          covered_cols: [2, 4],
        },
      ],
    };
    const result = normalizeAssign(raw, 5, 5);
    expect(result.answer.pairs[0]).toEqual([0, 4]);
    expect(result.answer.pairs[1]).toEqual([1, 2]);
    expect(result.steps[0].covered_rows).toEqual([0, 4]);
    expect(result.steps[0].covered_cols).toEqual([1, 3]);
  });

  it('handles unassigned rows from Part 3 contract as benched', () => {
    const raw = {
      status: 'optimal',
      answer: {
        pairs: [[1, 3], [3, 2], [4, 1], [5, 4]],
        total: 385,
        unassigned: { rows: [2], cols: [] },
      },
      steps: [],
    };
    const result = normalizeAssign(raw, 5, 4);
    const benched = result.answer.pairsInfo.find((p) => p.benched);
    expect(benched).toBeDefined();
    expect(benched.row).toBe(1);
    expect(benched.col).toBeNull();
  });

  it('handles more bosses than weapons (n < m, e.g. 4x5) by filtering dummy rows', () => {
    const raw = {
      status: 'optimal',
      answer: {
        pairs: [[1, 1], [2, 2], [3, 3], [4, 4], [5, 5]], // row 5 is dummy weapon
        total: 200,
        unassigned: { rows: [], cols: [5] }, // Boss 5 is unassigned
      },
      steps: [],
    };
    const result = normalizeAssign(raw, 4, 5);
    expect(result.answer.pairsInfo.length).toBe(4);
    expect(result.answer.unassigned.cols).toEqual([4]);
  });
});

describe('validateScores utility', () => {
  it('accepts valid score matrix', () => {
    expect(validateScores([[80, 70], [90, 60]]).valid).toBe(true);
  });

  it('rejects invalid cell values', () => {
    expect(validateScores([['', 70], [90, 60]]).valid).toBe(false);
    expect(validateScores([[-5, 70], [90, 60]]).valid).toBe(false);
    expect(validateScores([[1005, 70], [90, 60]]).valid).toBe(false);
  });

  it('rejects decimal numbers', () => {
    expect(validateScores([[12.5, 70], [90, 60]]).valid).toBe(false);
    expect(validateScores([[80, 0.75], [90, 60]]).valid).toBe(false);
    expect(validateScores([[80, 70], [99.99, 60]]).valid).toBe(false);
  });
});

describe('Opening steps, page structure and mode sync', () => {
  const openSteps = async () => {
    fireEvent.click(screen.getByRole('button', { name: /^solve$/i }));
    await waitFor(() => {
      expect(screen.getAllByText('445').length).toBeGreaterThan(0);
    });
    fireEvent.click(screen.getAllByRole('button', { name: /view steps/i })[0]);
  };

  it('opens with the original matrix, then the converted matrix with P_max = 97', async () => {
    render(<MatchupsTab />);
    await openSteps();
    expect(screen.getByText(/Step 1 of/i)).toBeInTheDocument();
    expect(screen.getByText(/Original matrix: the damage each weapon deals/i)).toBeInTheDocument();
    // original scores are shown unchanged
    expect(screen.getAllByText('82').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: /^next$/i }));
    expect(screen.getByText(/Step 2 of/i)).toBeInTheDocument();
    expect(screen.getByText(/Subtract every score from the largest score \(P_max = 97\)/i)).toBeInTheDocument();
    // 97 - 82 = 15 is the first converted cell
    expect(screen.getAllByText('15').length).toBeGreaterThan(0);
  });

  it('explains the Dummy column on the convert step of the 5x4 case', async () => {
    await renderSolved();
    await waitFor(() => expect(screen.getAllByText('445').length).toBeGreaterThan(0));
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'unbalanced' } });
    fireEvent.click(screen.getByRole('button', { name: /^solve$/i }));
    await waitFor(() => expect(screen.getAllByText('385').length).toBeGreaterThan(0));
    fireEvent.click(screen.getAllByRole('button', { name: /view steps/i })[0]);
    fireEvent.click(screen.getByRole('button', { name: /^next$/i }));
    expect(screen.getByText(/A Dummy column of zeros pads the grid/i)).toBeInTheDocument();
  });

  it('says scores are used as they are in minimize mode', async () => {
    await renderSolved();
    await waitFor(() => expect(screen.getAllByText('445').length).toBeGreaterThan(0));
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'adjust' } });
    fireEvent.click(screen.getByRole('button', { name: /^solve$/i }));
    await waitFor(() => expect(screen.getAllByText('17').length).toBeGreaterThan(0));
    fireEvent.click(screen.getAllByRole('button', { name: /view steps/i })[0]);
    expect(screen.getByText(/Original matrix: the cost of each weapon/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^next$/i }));
    expect(screen.getByText(/already costs, so they are used as they are/i)).toBeInTheDocument();
  });

  it('does not add a second h1 or a hidden raw-total element to the app shell', async () => {
    await renderSolved();
    await waitFor(() => expect(screen.getAllByText('445').length).toBeGreaterThan(0));
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
    expect(screen.queryByTestId('raw-total')).not.toBeInTheDocument();
  });

  it('re-checks Maximize when new scenario scores arrive while the grid was in minimize mode', async () => {
    let utils;
    await act(async () => {
      utils = render(<MatchupsTab />);
    });
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'adjust' } });
    expect(screen.getByRole('checkbox')).not.toBeChecked();

    const next = [
      [10, 20],
      [30, 40],
    ];
    await act(async () => {
      utils.rerender(<MatchupsTab scenario={{ weapon_boss_scores: next }} />);
    });
    expect(screen.getByLabelText(/Weapon 1 vs Boss 1/i).value).toBe('10');
    expect(screen.getByRole('checkbox')).toBeChecked();
  });
});

describe('Edited grids in fixture mode', () => {
  it('does not leave green chosen cells on an edited grid whose result is hidden', async () => {
    await renderSolved();
    await waitFor(() => expect(screen.getAllByText('445').length).toBeGreaterThan(0));
    expect(screen.getAllByText('✓').length).toBe(5);

    fireEvent.change(screen.getByLabelText(/Weapon 1 vs Boss 1/i), { target: { value: '1' } });
    fireEvent.click(screen.getByRole('button', { name: /^solve$/i }));

    await waitFor(() => expect(screen.getByText(/Demo data mode:/i)).toBeInTheDocument());
    expect(screen.queryByText('Optimal Combat Assignment')).not.toBeInTheDocument();
    expect(screen.queryAllByText('✓').length).toBe(0);
  });

  it('shows the Dummy legend entry only when the replay has a dummy row or column', async () => {
    await renderSolved();
    await waitFor(() => expect(screen.getAllByText('445').length).toBeGreaterThan(0));
    fireEvent.click(screen.getAllByRole('button', { name: /view steps/i })[0]);
    expect(screen.queryByText(/Dummy \(padding\)/)).not.toBeInTheDocument();

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'unbalanced' } });
    fireEvent.click(screen.getByRole('button', { name: /^solve$/i }));
    await waitFor(() => expect(screen.getAllByText('385').length).toBeGreaterThan(0));
    fireEvent.click(screen.getAllByRole('button', { name: /view steps/i })[0]);
    // step 1 is the original 5x4 matrix (no padding yet); the padding appears on the convert step
    expect(screen.queryByText(/Dummy \(padding\)/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^next$/i }));
    expect(screen.getByText(/Dummy \(padding\)/)).toBeInTheDocument();
  });
});
