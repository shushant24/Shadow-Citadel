## What changed
Part #: 8 (Matchups tab, weapon-to-boss assignment). Pair partners: Part 3 (`/api/assign`) and Part 6 (shell / `StepPlayer`).

Matchups tab: editable score grid, Solve, result panel with greedy comparison, and an on-demand step replay (row reduction, column reduction, cover, adjust, final) for maximize and minimize, balanced and unbalanced grids.

- The tab opens unsolved (grid, hint, Solve, Reset). Nothing is solved until Solve is pressed; Reset returns to the unsolved default.
- Default 5x5 gives 445 (greedy 414). 5x4 gives 385 (Weapon 2 Benched). 4x5 gives 349 (Boss 4 unassigned). Minimize 4x4 gives cost 17 (delta 1). Part 3's maximize 4x4 gives 116 (delta 2).
- The replay is a compact player (`showScrubber={false}`, `showNote={false}`). It opens with two extra steps: the original matrix, then the converted matrix (P_max minus each score; see report 3.3).
- `normalizeAssign.js` converts the 1-based contract indices to 0-based for the UI.
- Report: `docs/report/part-8-matchups.md`, with 11 real screenshots in `docs/report/screenshots/` (captured from the dev server, desktop 1440 and phone 390).

## Edits to shared files (Part 6 / team): please review these
| File | Change | Why |
|---|---|---|
| `frontend/src/api.js` | `assign` takes `(scores, maximize)`; all fixture routing in one `assignFixture()`; `FIXTURE_LIMITS` text updated | 4x4 maximize / 4x4 minimize / 4x5 / unbalanced / square now route in one place; the old limits text was stale |
| `frontend/src/__tests__/api.test.js` | +1 test for 4x4 and 4x5 routing | covers the routing above |
| `frontend/src/__tests__/App.test.jsx` | the "445" check now presses Solve first and looks for the visible total, not the hidden `raw-total` span | the span was removed and Matchups no longer solves on open (Part 6 test: **Vishesh, please confirm**) |
| `fixtures/assign_4x5.json`, `fixtures/assign_adjust_min.json` | new fixtures (both match the live backend output) | cover 4x5 and minimize cases |
| `backend/tests/test_contract_shapes.py` | both fixtures added to `KINDS`; new `test_wide_and_minimize_assign_fixtures` | registered under the assign shape |
| `backend/tests/test_data_integrity.py` | both fixtures added to the envelope list | same |
| `frontend/package.json`, `frontend/package-lock.json`, `frontend/vite.config.js`, `frontend/src/theme.css` | adds Tailwind CSS v4 (`tailwindcss`, `@tailwindcss/vite`, one plugin line, `@import "tailwindcss"`) | the Matchups tab is styled with Tailwind utilities; main does not have Tailwind yet |
| `docs/api-contract.md` | fixtures list updated | same |
| `docs/decisions.md` | rows 11 (Tailwind) and 12 (fixture routing) | shared files were changed without a log entry |

## Open items
- **Tailwind (decisions row 11):** this PR adds it. Tailwind's base reset is global, so please look at the other tabs once after merging. Needs team confirmation.
- **Grid to Scenario panel sync:** `App.jsx` does not pass `onScoresChange`, and `ScenarioPanel` has no editor for `weapon_boss_scores`. The tab already calls `onScoresChange` if given. This is a Part 6 decision and is not part of this PR.
- **Part 10:** the values to expect (445, 414, 385, 349, 17, 116) are in report section 7.2; to be confirmed with Part 10.
- Phone width: the step matrix still scrolls sideways.

## Checks run
- Run on top of the current `main`: frontend 6 test files, 70 tests pass (33 in `MatchupsTab.test.jsx`), `vite build` OK; backend 124 passed, 7 expected-pending, ruff clean.

## Checklist (demo plan Section 7.3)
- [x] Follows the envelope / endpoint formats in `docs/api-contract.md`
- [x] Format additions (two fixtures): `docs/api-contract.md`, `fixtures/` and the tests were updated in this PR (`backend/contract.py` unchanged; shapes are the existing `assign` shape)
- [x] Frontend: component tests for fixture render and the error state
- [x] Removed the `@pending` marker from tests that now pass (none applied to this part)
- [x] Tests validate output with `check_contract(...)` (fixtures, via `test_contract_shapes.py`)
- [x] Matches the Section 4 expected values and the shared fixtures
- [ ] One review requested from a paired member (Aditya for the API, Vishesh for the shared files)

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_012tLtFk5KAxAqpW27GiqYx7
