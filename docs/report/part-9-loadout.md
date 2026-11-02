# Report Section: Part 9 — Loadout Tab (Stage 4 Crafting Simplex LP)

**Component Scope:** `frontend/src/tabs/LoadoutTab.jsx`, `frontend/src/tabs/loadout/PlanCard.jsx`, `frontend/src/tabs/loadout/ResourceMeters.jsx`, `frontend/src/tabs/loadout/SensitivityPanel.jsx`, `frontend/src/tabs/loadout/TableauView.jsx`, `frontend/src/tabs/loadout/formatBigM.js`, `frontend/src/__tests__/LoadoutTab.test.jsx`, `frontend/src/theme.css`.

---

## 1. Problem and UI Architecture

In the Shadow Citadel Raid Optimizer, **Stage 4 (Loadout)** optimizes post-combat consumable crafting using Linear Programming (LPP). After completing the checkpoint route in $t_{\text{tour}}$ minutes, the remaining raid duration $T_{\text{craft}} = T_{\text{raid}} - t_{\text{tour}}$ is spent crafting consumables to maximize bonus raid score $Z$ subject to carrying limits, stamina load, minimum survival points, and inventory capacity.

### Mathematical Formulation
$$\text{Maximize } Z = 8x_1 + 6x_2 + 10x_3 + 7x_4$$

$$\text{Subject to:}$$
1. **Craft Time:** $3x_1 + 4x_2 + 5x_3 + 3x_4 \le T_{\text{craft}} = 50\text{ min}$ (Slack $s_1$)
2. **Carry Weight:** $3x_1 + 2x_2 + 4x_3 + 1x_4 \le 40\text{ kg}$ (Slack $s_2$)
3. **Stamina Limit:** $4x_1 + 1x_2 + 5x_3 + 3x_4 \le 90\text{ pts}$ (Slack $s_3$)
4. **Minimum Survival:** $5x_1 + 2x_2 + 0x_3 + 3x_4 \ge 30\text{ pts}$ (Surplus $e_4$, Artificial $a_4$)
5. **Inventory Capacity:** $x_1 + x_2 + x_3 + x_4 = 14\text{ slots}$ (Artificial $a_5$)

Because the system includes both a $\ge$ constraint and an $=$ constraint, slack variables alone do not provide a starting identity basis. Part 9 provides step-by-step interactive inspection of both **Big-M Simplex** (symbolic $aM + b$ objective row) and **Two-Phase Simplex**.

---

## 2. Component Structure and Features

### 2.1 Interactive Controls & Scenario Sync (`LoadoutTab.jsx`)
- **Stage Chaining & Live Integration:** Queries `api.pipeline(scenario)` to retrieve the active `tour_time` (default 70 min) and `combat` score (default 445). Crafting time is dynamically computed as $T_{\text{craft}} = \max(0, T_{\text{total}} - t_{\text{tour}})$.
- **One-Click Presets:**
  - **Optimal (50 min, Big-M):** $Z = 117$, allocation $(7, 0, 4, 3)$, total raid score 562.
  - **Tight Boundary (42 min, Big-M):** $Z = 111$, allocation $(13, 0, 0, 1)$, total raid score 556.
  - **Naive Route Infeasible (40 min):** Leaves 40 minutes after an 80-minute tour. Evaluates dynamically against $\text{slots} \times \min(t_{\text{recipe}})$ ($14 \times 3\text{ min} = 42\text{ min}$), surfacing a clear mathematical diagnostic.
  - **Two-Phase Trace (50 min):** Switches to Two-Phase Simplex showing Phase 1 (artificial variable elimination) and Phase 2 (optimizing $Z$).
- **Debounced Time Slider (200ms):** Smooth interactive slider ranging from 30 to 70 minutes with debouncing to prevent excessive API calls and a reset button to restore scenario time.
- **Constraint Limits Overrides:** Direct numeric inputs for Carry Weight, Inventory Slots, Max Stamina, and Min Survival, with a one-click reset to scenario defaults.
- **Fixture Mismatch Prevention:** Passes the canned run's actual solved time limit to resource meters when offline fixture mode is active.

### 2.2 Optimal Plan Cards (`PlanCard.jsx`)
- **Stat Cards:** High-contrast displays for Crafting Bonus $Z$ (117), Combat Score (445 from Stage 3 Hungarian matching), and Total Raid Score ($562 = 445 + 117$).
- **Dynamic Slot Capacity:** Reflects active `limits.slots` (e.g. `14 / 14 Slots`).
- **Consumable Recipe Cards ($x_1..x_4$):**
  - **Health Potion ($x_1$):** 7 crafted ($+56$ pts) | $3\text{m}, 3\text{kg}, 4\text{ stam}, 5\text{ surv}$
  - **Stamina Potion ($x_2$):** 0 crafted ($+0$ pts) | $4\text{m}, 2\text{kg}, 1\text{ stam}, 2\text{ surv}$
  - **Damage Elixir ($x_3$):** 4 crafted ($+40$ pts) | $5\text{m}, 4\text{kg}, 5\text{ stam}, 0\text{ surv}$
  - **Shield Scroll ($x_4$):** 3 crafted ($+21$ pts) | $3\text{m}, 1\text{kg}, 3\text{ stam}, 3\text{ surv}$

### 2.3 Resource Consumption Meters (`ResourceMeters.jsx`)
- Renders 5 real-time progress bars:
  - **Crafting Time:** $50 / 50\text{ min}$ (100% — **Binding**)
  - **Carry Weight:** $40 / 40\text{ kg}$ (100% — **Binding**)
  - **Inventory Slots:** $14 / 14\text{ slots}$ (100% — **Binding**)
  - **Stamina Load:** $57 / 90\text{ pts}$ (63% — 33 pts Slack)
  - **Survival Points:** $44 / 30\text{ pts}$ (147% — $+14$ pts Surplus)
- High-visibility badges denote Binding constraints versus available Slack/Surplus.

### 2.4 Sensitivity Analysis & Shadow Prices (`SensitivityPanel.jsx`)
- **Bottleneck Callout Banner:** Dynamically surfaces `answer.bottleneck` ("Crafting time is the bottleneck: each extra minute adds 0.75 score.") in standard info alert styling.
- **Dynamic Dual Shadow Price Breakdown:**
  - Computes interpretations dynamically from actual values and binding status:
    - Binding with positive value: `+${formatNum(price)} raid score per additional ${unit}`.
    - Non-binding: `Non-binding: surplus/slack remains, so relaxing limit does not change score`.
  - Dual prices:
    - **Crafting Time ($s_1$):** $+0.75\text{ pts / min}$
    - **Carry Weight ($s_2$):** $+0.50\text{ pts / kg}$
    - **Inventory Slots:** $+4.25\text{ pts / slot}$
    - **Stamina ($s_3$):** $0.00$
    - **Survival ($e_4$):** $0.00$
  - Relative bar width clamped to $\ge 0$ to cleanly handle equality constraint duals.

### 2.5 Simplex Tableaux Stepper (`TableauView.jsx`)
- Embedded into the shared `StepPlayer` with Back, Next, First, Last, Auto-play, and Speed controls.
- **Entering and Leaving Variable Badges:** `↓ x1` entering column and `← a4` leaving row.
- **Pivot Highlight:** Pivot element cell is highlighted in high-contrast gold (`.td-pivot-cell`) with row/column coordinate labels.
- **Big-M Symbolic Formatting (`formatBigM.js`):** Formats Row 0 objective entries symbolically as $aM + b$ (e.g. `-6M - 8`, `M`, `-M + 3`, `117`).
- **Infeasible Trace Accessibility:** The full tableaux trace remains completely interactive even when infeasible.

---

## 3. Verification & Testing

The implementation was validated using automated tests in `frontend/src/__tests__/LoadoutTab.test.jsx`:
- **Default Optimal Solution:** Verified $Z=117$, live combat score 445, total 562, allocation $(7, 0, 4, 3)$, and binding constraints.
- **Dynamic Interpretations:** Verified shadow price interpretations are generated from live data without hardcoded values.
- **Symbolic Formatting:** Verified all $aM + b$ cases (`-6M - 8`, `M`, `-M + 3`, `117`, etc.).
- **Pivot Highlighting:** Verified entering indicator, leaving indicator, pivot coordinate, and `.td-pivot-cell`.
- **Dynamic Infeasibility Card:** Verified calculation using $\text{slots} \times \min(t_{\text{recipe}})$ ($14 \times 3 = 42\text{ min}$) and absence of unrendered LaTeX delimiters.
- **Constraint Overrides:** Verified editing and resetting limits for weight, slots, stamina, and survival.
- **Two-Phase Switch:** Verified mode toggle correctly loads Two-Phase tableaux trace.
- **StepPlayer Navigation:** Verified Next/Back step progression and tableau hide/show toggling.
- **Slider Debounce & Reset:** Verified 200ms debouncing and reset mechanism.

Full suite status:
- Frontend: **88 passed, 0 failed** across 8 test suites.
- Backend: **135 passed, 0 failed**.
- CSS: **133 selectors in Part 9, 0 duplicate selectors**.
