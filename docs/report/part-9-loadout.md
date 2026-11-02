# Report Section: Part 9 — Loadout Tab (Stage 4 Crafting Simplex LP)

**Component Scope:** `frontend/src/tabs/LoadoutTab.jsx`, `frontend/src/tabs/loadout/PlanCard.jsx`, `frontend/src/tabs/loadout/ResourceMeters.jsx`, `frontend/src/tabs/loadout/SensitivityPanel.jsx`, `frontend/src/tabs/loadout/TableauView.jsx`, `frontend/src/tabs/loadout/formatBigM.js`, `frontend/src/__tests__/LoadoutTab.test.jsx`, `frontend/src/theme.css`.

---

## 1. Problem and UI Architecture

In the Shadow Citadel Raid Optimizer, **Stage 4 (Loadout)** optimizes post-combat consumable crafting using Linear Programming (LPP). After completing the checkpoint route in $t_{\text{tour}}$ minutes, the remaining raid duration $T_{\text{craft}} = 120 - t_{\text{tour}}$ is spent crafting consumables to maximize bonus raid score $Z$ subject to carrying limits, stamina load, minimum survival points, and inventory capacity.

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
- **Stage Chaining & Automatic Sync:** Default crafting time is derived from `scenario.total_time - 70` (120 - 70 = 50 min). When raid duration is modified in `ScenarioPanel`, the crafting time updates automatically.
- **One-Click Presets:**
  - **Optimal (50 min, Big-M):** $Z = 117$, allocation $(7, 0, 4, 3)$, total raid score 562.
  - **Tight Boundary (42 min, Big-M):** $Z = 111$, allocation $(13, 0, 0, 1)$, total raid score 556.
  - **Naive Route Infeasible (40 min):** Leaves 40 minutes after an 80-minute nearest-neighbour tour. The 14-slot loadout requires at least 42 minutes ($14 \times 3\text{ min}$), rendering the plan strictly infeasible.
  - **Two-Phase Trace (50 min):** Switches to Two-Phase Simplex showing Phase 1 (artificial variable elimination) and Phase 2 (optimizing $Z$).
- **Interactive Slider:** Allows continuous testing of craft time overrides from 30 to 70 minutes with visual tick marks, boundary indicators, and a one-click reset back to scenario time.

### 2.2 Optimal Plan Cards (`PlanCard.jsx`)
- **Stat Cards:** Large high-contrast displays for Crafting Bonus $Z$ (117), Combat Score (445 from Stage 3 Hungarian matching), and Total Raid Score ($562 = 445 + 117$).
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
- **Bottleneck Callout Banner:** Dynamically surfaces `answer.bottleneck` ("Crafting time is the bottleneck: each extra minute adds 0.75 score.").
- **Dual Shadow Price Breakdown:**
  - **Crafting Time ($s_1$):** $+0.75\text{ pts / min}$ (each extra minute saved on the map tour yields $+0.75$ raid score).
  - **Carry Weight ($s_2$):** $+0.50\text{ pts / kg}$.
  - **Inventory Slots ($a_5$):** $+4.25\text{ pts / slot}$.
  - **Stamina ($s_3$):** $0.00$ (ample buffer remains).
  - **Survival ($e_4$):** $0.00$ (threshold already satisfied).

### 2.5 Simplex Tableaux Stepper (`TableauView.jsx`)
- Embedded into the shared `StepPlayer` with Back, Next, First, Last, Auto-play, and Speed controls.
- **Entering and Leaving Variable Badges:** e.g. `↓ x1` entering column and `← a4` leaving row.
- **Pivot Highlight:** Pivot element cell is highlighted in high-contrast gold (`.td-pivot-cell`) with explicit row and column coordinate labels.
- **Big-M Symbolic Formatting (`formatBigM.js`):** Formats Row 0 objective entries symbolically as $aM + b$ (e.g. `-6M - 8`, `3M - 8`), correctly handling negative constants and integer/float formatting.
- **Infeasible Trace Accessibility:** The full tableaux trace remains completely interactive even when infeasible, showing the final tableau where artificial variable $a_5$ remains in the basis with positive RHS ($0.67$).

---

## 3. Verification & Testing

The implementation was validated using automated tests in `frontend/src/__tests__/LoadoutTab.test.jsx`:
- **Default Optimal Solution:** Verified $Z=117$, combat score 445, total 562, allocation $(7, 0, 4, 3)$, and binding constraints.
- **Symbolic Formatting:** Verified all $aM + b$ cases (`-6M - 8`, `M`, `-M + 3`, `117`, etc.).
- **Pivot Highlighting:** Verified entering indicator, leaving indicator, pivot coordinate, and `.td-pivot-cell`.
- **Presets & Infeasibility:** Verified 42-minute boundary ($Z=111$) and 40-minute infeasible alert with diagnostic explanation.
- **Two-Phase Switch:** Verified mode toggle correctly loads Two-Phase tableaux trace.
- **StepPlayer Navigation:** Verified Next/Back step progression and tableau hide/show toggling.
- **Slider Sync:** Verified manual slider adjustments and scenario reset mechanism.

Full suite status:
- Frontend: **87 passed, 0 failed** across 8 test suites.
- Backend: **135 passed, 0 failed**.
