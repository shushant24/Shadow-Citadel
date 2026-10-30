# Task 2: Sensitivity Analysis & Crafting Service

**CS2105 Optimization Techniques · Option 2: Shadow Citadel Raid Optimizer**

This repository contains the standalone, fully tested implementation of **Task 2 (Backend Part 2: Sensitivity and Crafting Service)**.

---

## 1. Directory Structure

```text
task2/
├── README.md                      # Overview & report documentation
├── MERGE_GUIDE.md                 # Step-by-step guide to merge into main project
├── envelope.py                    # Shared response envelope contract
├── contract.py                    # Shared API contract validator
├── conftest.py                    # Pytest configuration & scenario fixtures
├── api_craft.py                   # Root forwarding module
├── test_part2_sensitivity.py      # Official Part 2 test suite
├── api/
│   ├── __init__.py
│   └── api_craft.py               # FastAPI /api/craft endpoint
├── solvers/
│   ├── __init__.py
│   ├── simplex.py                 # Simplex Tableau engine (Part 1 dependency)
│   ├── bigm.py                    # Big-M solver (Part 1 dependency)
│   ├── twophase.py                # Two-Phase solver (Part 1 dependency)
│   └── sensitivity.py             # Shadow prices, ranging & bottleneck (Part 2)
├── tests/
│   └── test_craft_api.py          # API endpoint unit tests
└── fixtures/
    └── craft.json                 # Reference mock fixture for Loadout tab
```

---

## 2. Mathematical Formulation

Let:
* $x_1$: Health potions
* $x_2$: Stamina potions
* $x_3$: Damage elixirs
* $x_4$: Shield scrolls

$$\text{Maximize } Z = 8x_1 + 6x_2 + 10x_3 + 7x_4$$

Subject to 5 constraints:
1. **Craft Time**: $3x_1 + 4x_2 + 5x_3 + 3x_4 \le T_{\text{craft}}$ (where $T_{\text{craft}} = 120 - T_{\text{tour}}$)
2. **Weight Limit**: $3x_1 + 2x_2 + 4x_3 + 1x_4 \le 40$
3. **Stamina Limit**: $4x_1 + 1x_2 + 5x_3 + 3x_4 \le 90$
4. **Minimum Survival**: $5x_1 + 2x_2 + 0x_3 + 3x_4 \ge 30$
5. **Inventory Slots**: $x_1 + x_2 + x_3 + x_4 = 14$
6. **Non-negativity**: $x_1, x_2, x_3, x_4 \ge 0$

---

## 3. Results & Expected Outputs

| Case | Time Limit | Status | Score ($Z$) | Item Quantities ($x$) | Key Sensitivity / Shadow Prices |
|---|---|---|---|---|---|
| **Demo Base** | $50$ min | `optimal` | **$117$** | $[7, 0, 4, 3]$ | `time: 0.75`, `weight: 0.50`, `slots: 4.25` |
| **Lower Range** | $42$ min | `optimal` | **$111$** | $[13, 0, 0, 1]$ | Valid within RHS range ($117 - 8 \times 0.75 = 111$) |
| **Naive Route** | $40$ min | `infeasible` | — | — | Artificial variable remains; 14 slots cannot be crafted |

* **Bottleneck**: `"Crafting time is the bottleneck: each extra minute adds 0.75 score."`

---

## 4. Running the Tests

To run all tests in this folder:

```bash
# Run the official sensitivity test suite
pytest test_part2_sensitivity.py -v

# Run the API endpoint tests
pytest tests/test_craft_api.py -v
```

All tests pass without warnings or errors.

---

## 5. Merging into the Main Team Repository

See [`MERGE_GUIDE.md`](./MERGE_GUIDE.md) for full instructions on creating a branch, committing, creating a Pull Request, and wiring the endpoint to `app.py`, `pipeline.py`, and the Part 9 Loadout frontend tab.
