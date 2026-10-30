# Report and slides

The plan asks every member for their own report section (theory or UI design, formulation, screenshots); slides are assembled together in the last phase.

## Section template (copy to `report/part-<n>-<name>.md`)
1. **Problem and theory**: what the technique solves and the textbook method, in your own words.
2. **Formulation**: the model with the demo numbers (LP, matrix, graph).
3. **Implementation notes**: data structures, tie-breaking, edge cases (link to `docs/decisions.md` entries).
4. **Results**: the Section 4 value you reproduce, plus a screenshot from `screenshots/`.
5. **Testing**: which tests cover it.

## Screenshots to capture (name them `<tab>-<what>.png`)
- Map: hull + 70-minute tour; nearest-neighbour toggle (80); subtour overlay from the first Hungarian pass (64).
- Matchups: conversion matrix, a cover/adjust step, final pairs (445), unbalanced case.
- Loadout: Big-M tableau with pivot highlighted, shadow price chart, 40-minute infeasible message, 42-minute plan (111).
- Summary: naive vs optimized charts (12.5%, 7.5%), total score card (562), 20-map table.

## Slides outline
Problem and pipeline diagram, one slide per stage (question, technique, result), naive vs optimized, the stage dependency (80-minute tour makes crafting infeasible), 20-map results, live demo, limitations (LP relaxation, rounded distances).
