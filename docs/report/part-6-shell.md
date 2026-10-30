# Report Section: Part 6 — App Shell and Shared Components

**Component Scope:** `frontend/src/App.jsx`, `frontend/src/api.js`, `frontend/src/components/StepPlayer.jsx`, `frontend/src/components/ScenarioPanel.jsx`, `frontend/src/components/Status.jsx`, `frontend/src/useApi.js`, `frontend/src/theme.css`.

---

## 1. Problem and UI Architecture
Part 6 establishes the common shell and cross-tab abstractions for the Shadow Citadel Raid Optimizer. The frontend must:
- Host four specialized optimization modules (Map / TSP, Matchups / Assignment, Loadout / Simplex LP, and Summary / Experiments).
- Provide a universal replay player (`StepPlayer`) capable of stepping through tree branches (B&B), matrix reductions (Hungarian), or simplex tableau pivots.
- Allow live editing of raid time and crafting parameters in `ScenarioPanel`, reactively propagating updates to all tabs.
- Handle solver feasibility states (`infeasible` / `unbounded`), displaying human-readable diagnoses while allowing users to inspect the intermediate steps leading to termination.

---

## 2. Shared Component Design & Data Flow

### 2.1 Scenario Editor (`ScenarioPanel.jsx`)
- Provides direct input controls for `total_time` (raid duration), crafting limits (`weight`, `stamina`, `survival_min`, `slots`), and the 4-item crafting recipe matrix (`score`, `time`, `weight`, `stamina`, `survival`).
- Dispatches immutable state updates via `onChange(nextScenario)` back to `App.jsx`.
- Includes a "Reset to Defaults" mechanism that restores the scenario back to the baseline fixture state.
- Preserves all map nodes, loot coordinates, and boss score matrices intact.

### 2.2 Reusable Step Player (`StepPlayer.jsx`)
- Uses the React render-prop pattern:
  ```jsx
  <StepPlayer steps={data.steps}>
    {(step, index) => <TabCustomView step={step} index={index} />}
  </StepPlayer>
  ```
- Implements boundary jumps (`|< First`, `>| Last`), step-by-step navigation (`< Back`, `Next >`), and auto-play with timer cleanup.
- Includes a responsive timeline scrubber (`<input type="range">`) for random access across large step traces (such as the 23-node TSP B&B tree).
- Provides speed presets (Fast 300ms, Normal 800ms, Slow 1500ms) and numeric ms input.
- Displays metadata banners for `step.note`, `step.phase`, and `step.status`.
- Supports keyboard navigation (ArrowLeft, ArrowRight, Home, End, Space).

### 2.3 Diagnostic Status Envelope (`Status.jsx`)
- Displays loading spinners and network/server error alerts (`role="alert"`).
- For `infeasible` or `unbounded` statuses, renders a high-visibility warning banner (`role="status"`) containing `answer.message`.
- Crucially keeps child components rendered so users can interactively step through the tableaux or trees that led to the infeasible state.

### 2.4 Dark Citadel Theme (`theme.css`)
- Cohesive dark-mode tactical RPG theme with curated HSL/hex design tokens.
- Styled tabs, buttons, form controls, tables, and timeline scrubbers.

---

## 3. Implementation Notes and Edge Cases
1. **Defensive Immutability:** `ScenarioPanel` clones nested arrays/objects before mutation to prevent accidental mutations of shared fixtures.
2. **Step List Lifecycle:** When `StepPlayer` receives a new `steps` array prop (e.g. switching between Big-M and Two-Phase or loading a new scenario), it resets playback index to 0 and clears running timers.
3. **Single Step & Empty Boundaries:** If `steps` has 0 items, a clean fallback message is rendered. If `steps` has 1 item, all directional and playback buttons are safely disabled.

---

## 4. Testing & Verification

Comprehensive Vitest + React Testing Library test suites:
- `src/__tests__/ScenarioPanel.test.jsx`: 8 unit tests covering field rendering, null scenario, numeric updates with blur-to-commit, draft-string validation rejection, recipe matrix updates, reset button, limit editing, and raw JSON inspection.
- `src/__tests__/StepPlayer.test.jsx`: 13 unit tests covering forward/backward navigation, first/last boundary jumps, scrubber range interaction, timer auto-play and auto-pausing at the end, restart from end, shrinking steps, keyboard navigation (ArrowLeft/Right, Home, End, Space), modifier key suppression (Alt, Ctrl, Meta), input-key isolation, no-steps re-render stability, speed input, metadata banners, empty and single-step states.
- `src/__tests__/Status.test.jsx`: 3 unit tests verifying error alerts, optimal silent rendering, and infeasible status preserving children.
- `src/__tests__/App.test.jsx`: 3 unit tests verifying all 4 tabs rendering, tab switching, fixtures mode badge, and scenario editing and resetting.
- `src/__tests__/api.test.js`: 6 contract and fixture tests verifying immutability, Big-M vs Two-Phase, 40-minute infeasibility, 42-minute plan, and matrix/points requests.

**Test Results:**
- 5 Test Files, 33 tests passing (100% pass rate).
- Production build verified: `vite build` generated output bundle cleanly in <500ms.
