# Stage 4: Consumable Crafting Optimizer (LPP) — Part 9 Report

**Owner:** Shristi  
**Component:** Loadout Tab (`tabs/LoadoutTab.jsx`)  
**Fixtures:** `fixtures/craft.json`, `fixtures/craft_twophase.json`, `fixtures/craft_infeasible.json`  
**Paired With:** Shushant (Part 1 — Simplex Engine), Mohit (Part 2 — Sensitivity & Crafting Service)  

---

## 1. Problem Formulation & Theory

In the Shadow Citadel Raid Optimizer, Stage 4 models the post-combat crafting strategy. Once the raid party completes the checkpoint tour in $t_{\text{tour}}$ minutes, the remaining time $T_{\text{craft}} = 120 - t_{\text{tour}}$ must be spent crafting consumables that maximize bonus score while satisfying physical carrying limits and survival requirements.

### 1.1 Decision Variables
Let:
- $x_1$: Units of **Health Potion** crafted ($c_1 = 8$)
- $x_2$: Units of **Stamina Potion** crafted ($c_2 = 6$)
- $x_3$: Units of **Damage Elixir** crafted ($c_3 = 10$)
- $x_4$: Units of **Shield Scroll** crafted ($c_4 = 7$)
- All $x_j \ge 0, \quad j \in \{1, 2, 3, 4\}$

### 1.2 Mathematical Model
$$\text{Maximize } Z = 8x_1 + 6x_2 + 10x_3 + 7x_4$$

$$\text{Subject to:}$$
1. **Craft Time:** $3x_1 + 4x_2 + 5x_3 + 3x_4 \le 120 - t_{\text{tour}} = 50$ (slack $s_1 \ge 0$)
2. **Carry Weight:** $3x_1 + 2x_2 + 4x_3 + 1x_4 \le 40$ (slack $s_2 \ge 0$)
3. **Stamina Limit:** $4x_1 + 1x_2 + 5x_3 + 3x_4 \le 90$ (slack $s_3 \ge 0$)
4. **Minimum Survival:** $5x_1 + 2x_2 + 0x_3 + 3x_4 \ge 30$ (surplus $e_4 \ge 0$, artificial $a_4 \ge 0$)
5. **Inventory Capacity:** $x_1 + x_2 + x_3 + x_4 = 14$ (artificial $a_5 \ge 0$)

---

## 2. Why Big-M and Two-Phase Simplex Are Required

Standard Simplex assumes all constraints are in canonical form with non-negative right-hand sides and slack variables forming an initial identity basis. However, Stage 4 introduces:
- A **$\ge$ constraint** (Survival points $\ge 30$), which yields $-e_4 + a_4 = 30$.
- An **$=$ constraint** (Inventory slots $= 14$), which yields $a_5 = 14$.

Because slack variables alone do not provide a starting basic feasible solution, artificial variables $a_4, a_5$ must be introduced.

### Method Comparison
1. **Big-M Method:** Penalizes artificial variables directly in the objective function with a large scalar $M$:
   $$\text{Max } Z - M a_4 - M a_5$$
   The Loadout tab renders entries symbolically as $aM + b$ (e.g. $-6M - 8$), highlighting the pivot element and demonstrating how artificial variables are forced out of the basis.
2. **Two-Phase Method:**
   - **Phase 1:** Minimizes the sum of artificials $W = a_4 + a_5$. If $\min W = 0$, a feasible basis exists.
   - **Phase 2:** Drops artificial columns, restores the original objective coefficients $c_j$, and maximizes $Z$ to optimality.

---

## 3. Optimal Solution & Chaining Verification

| Metric | Target Value | Verification Check |
|---|---|---|
| **Optimal Allocation** | $x = (7, 0, 4, 3)$ | 7 Health Potions, 0 Stamina, 4 Damage Elixirs, 3 Shield Scrolls |
| **Crafting Score ($Z$)** | **117** | $8(7) + 6(0) + 10(4) + 7(3) = 56 + 0 + 40 + 21 = 117$ |
| **Combat Score (Stage 3)** | **445** | Optimal Hungarian weapon-to-boss assignment |
| **Total Raid Score** | **562** | $445 + 117 = 562$ |
| **Craft Time Consumed** | **50 / 50 min** | $3(7) + 4(0) + 5(4) + 3(3) = 50$ (Binding) |
| **Weight Consumed** | **40 / 40 kg** | $3(7) + 2(0) + 4(4) + 1(3) = 40$ (Binding) |
| **Inventory Slots** | **14 / 14** | $7 + 0 + 4 + 3 = 14$ (Binding) |
| **Stamina Consumed** | **57 / 90** | Slack $s_3 = 33 > 0$ (Non-binding) |
| **Survival Achieved** | **44 / 30** | Surplus $e_4 = 14 > 0$ (Non-binding) |

---

## 4. Sensitivity Analysis & Duality (Shadow Prices)

From the final tableau Row 0:
- **Craft Time ($s_1$):** **0.75 score / min**. Every additional minute saved on the map tour increases raid score by 0.75 points.
- **Carry Weight ($s_2$):** **0.50 score / kg**.
- **Inventory Slots ($a_5$):** **4.25 score / slot**.
- **Stamina ($s_3$):** **0.00** (non-binding).
- **Survival ($e_4$):** **0.00** (non-binding).

### Stage Dependency & Infeasibility Proof:
- **Naive Nearest-Neighbour Tour (80 min):** Leaves $120 - 80 = 40$ min crafting time. To craft 14 items, the minimum possible time is $14 \times 3 = 42$ min. Thus, the naive route renders Stage 4 **strictly infeasible**.
- **Tight Route (78 min):** Leaves 42 min crafting time. Yields $x = (13, 0, 0, 1)$ and $Z = 111$ ($117 - 8 \times 0.75 = 111$).
- **Optimized Hungarian Route (70 min):** Leaves 50 min crafting time, unlocking $Z = 117$ and the full 562 raid score.

---

## 5. UI Architecture & Features in `LoadoutTab.jsx`

1. **Preset Shortcuts:** One-click presets for Optimal (50 min), Tight (42 min), and Infeasible (40 min).
2. **Interactive Sliders:** Dynamic adjustment of Time, Weight, Stamina, Survival, and Slots.
3. **Big-M Symbolic Formatting:** Tableau entries formatted as $aM + b$ with pivot cells highlighted in gold.
4. **StepPlayer Replay:** Step-by-step playback with Back, Next, Auto-play, and Speed control.
5. **Readable Infeasibility Card:** High-contrast alert explaining the mathematical cause of failure and recommending TSP route reduction.
6. **Dual Mode Support:** Seamless fallback between live FastAPI endpoints and mock fixtures.
