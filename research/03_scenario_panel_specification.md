# Research Document 3: Scenario Panel Specification

## 1. Objective and Requirements

The `ScenarioPanel` is the interactive editor for raid scenario parameters. In the initial skeleton, it was a placeholder displaying static JSON with the notice:
> *"TODO Part 6: editable fields for time limit, limits and recipes; call onChange(next)."*

The Part 6 specification requires:
1. Interactive input controls for raid constraints and recipes.
2. Immediate propagation of updates via `onChange(nextScenario)`.
3. Ability to reset changes back to initial scenario defaults.
4. Clean, responsive, compact UI that does not overpower the active tab.

---

## 2. Scenario Schema Definition (`data/scenario.json`)

The scenario object adheres to the following structure:

```json
{
  "total_time": 120,
  "nodes": {
    "Base": [0,0], "C1": [15,18], "C2": [19,5], "C3": [7,14],
    "C4": [9,11], "C5": [2,9], "C6": [5,20], "C7": [2,5]
  },
  "loot": {
    "L1": [23,12], "L2": [12,23], "L3": [5,16], "L4": [16,4]
  },
  "weapon_boss_scores": [
    [82,64,97,43,96],
    [48,40,61,59,50],
    [83,97,81,50,61],
    [95,78,72,60,84],
    [69,79,54,96,66]
  ],
  "recipes": {
    "score":    [8,  6, 10, 7],
    "time":     [3,  4,  5, 3],
    "weight":   [3,  2,  4, 1],
    "stamina":  [4,  1,  5, 3],
    "survival": [5,  2,  0, 3]
  },
  "limits": {
    "weight": 40,
    "stamina": 90,
    "survival_min": 30,
    "slots": 14
  }
}
```

### Item Mapping
The 4 columns in `recipes` correspond to:
- Index 0: `x1` — Health potion
- Index 1: `x2` — Stamina potion
- Index 2: `x3` — Damage elixir
- Index 3: `x4` — Shield scroll

---

## 3. UI/UX Layout Design

The panel is structured into clean, styled sections inside an expandable container:

```
+-------------------------------------------------------------------------------+
|  ▶ Scenario Configuration (8 nodes, 4 loot drops) [Edited] [Reset Defaults]   |
+-------------------------------------------------------------------------------+
|  [ Section 1: Raid Overview ]                                                 |
|  Raid Time Limit: [ 120 ] min                                                 |
|                                                                               |
|  [ Section 2: Inventory & Crafting Limits ]                                   |
|  Max Weight (kg): [ 40 ]       Max Stamina Cost: [ 90 ]                       |
|  Min Survival Points: [ 30 ]   Required Slots:   [ 14 ]                       |
|                                                                               |
|  [ Section 3: Crafting Recipes (Items x1 to x4) ]                             |
|  +--------------------+-------+------+--------+---------+----------+          |
|  | Item Name          | Score | Time | Weight | Stamina | Survival |          |
|  +--------------------+-------+------+--------+---------+----------+          |
|  | x1 Health Potion   | [ 8 ] | [3]  | [ 3 ]  | [ 4 ]   | [ 5 ]    |          |
|  | x2 Stamina Potion  | [ 6 ] | [4]  | [ 2 ]  | [ 1 ]   | [ 2 ]    |          |
|  | x3 Damage Elixir   | [10 ] | [5]  | [ 4 ]  | [ 5 ]   | [ 0 ]    |          |
|  | x4 Shield Scroll   | [ 7 ] | [3]  | [ 1 ]  | [ 3 ]   | [ 3 ]    |          |
|  +--------------------+-------+------+--------+---------+----------+          |
|                                                                               |
|  [ View Raw JSON ] (Collapsible toggle)                                       |
+-------------------------------------------------------------------------------+
```

---

## 4. State Management and Mutation Helpers

To ensure state immutability, mutations clone the target branch:

### 4.1 Modifying `total_time`
```javascript
const handleTotalTimeChange = (e) => {
  const val = Number(e.target.value);
  if (isNaN(val) || val < 0) return;
  onChange({
    ...scenario,
    total_time: val,
  });
};
```

### 4.2 Modifying `limits`
```javascript
const handleLimitChange = (key, value) => {
  const val = Number(value);
  if (isNaN(val) || val < 0) return;
  onChange({
    ...scenario,
    limits: {
      ...scenario.limits,
      [key]: val,
    },
  });
};
```

### 4.3 Modifying `recipes` Attributes
```javascript
const handleRecipeChange = (attr, itemIndex, value) => {
  const val = Number(value);
  if (isNaN(val) || val < 0) return;
  const nextArr = [...scenario.recipes[attr]];
  nextArr[itemIndex] = val;
  onChange({
    ...scenario,
    recipes: {
      ...scenario.recipes,
      [attr]: nextArr,
    },
  });
};
```

### 4.4 Resetting Defaults
`ScenarioPanel` receives an `onReset` callback (or handles it via a stored baseline snapshot):
```javascript
<button type="button" className="btn-secondary" onClick={onReset} disabled={!isEdited}>
  Reset to Defaults
</button>
```

---

## 5. Form Validation & Edge Cases

1. **Non-negative Constraints:**
   - All limits and recipe numbers must be non-negative (`min="0"` on HTML inputs).
   - `slots` must be a positive integer (`>= 1`).
2. **Numeric Parsing:**
   - Empty input handling: inputting `""` should not crash with `NaN`; gracefully fall back to 0 or preserve until blur.
3. **Preservation of Non-Form Fields:**
   - `nodes`, `loot`, and `weapon_boss_scores` must be preserved intact during recipe/limits updates.
