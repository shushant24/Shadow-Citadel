# Research Document 5: Status and Theme Design System

## 1. Objective

Part 6 establishes the visual aesthetic and global feedback systems for the Shadow Citadel Raid Optimizer. This includes:
1. The shared `Status` component, providing consistent handling of loading, network errors, and solver feasibility envelopes.
2. The `theme.css` design system, delivering a cohesive dark-mode RPG/tactical raid aesthetic.

---

## 2. Envelope Status Handling (`Status.jsx`)

### 2.1 The Four Operational States
The API envelope returns one of four primary states that `Status` must communicate:

| State | Indicator | UI Behavior | Accessibility |
|---|---|---|---|
| **Loading** | `loading === true` | Display animated loading spinner/text. Hide children. | `aria-busy="true"` |
| **Network / Server Error** | `error != null` | Display red error banner with error message. Hide children. | `role="alert"` |
| **Infeasible / Unbounded** | `result.status !== "optimal"` | Display amber/warning notice with `result.answer.message`. **Render children below warning.** | `role="status"` |
| **Optimal** | `result.status === "optimal"` | No warning banner. Render children directly. | Normal DOM |

### 2.2 Why Children Render During Infeasibility
`docs/api-contract.md` specifies:
> *"Infeasible and unbounded results are normal answers: HTTP 200, status set accordingly, and answer.message holding one readable sentence the UI shows as-is (the shared Status component does this). Steps may still be present (the tableau that ended in infeasibility)."*

For example:
- In the 40-minute crafting case (`fixtures/craft_infeasible.json`), Simplex terminates with an artificial variable remaining in the basis.
- The user **must still be able to step through the tableaux** using `StepPlayer` to inspect why the plan was infeasible!
- If `Status` hid children on `infeasible`, tabs would be unable to show the diagnostic step history.

---

## 3. Dark Mode RPG Theme Design Tokens (`theme.css`)

### 3.1 Color Palette
The theme reflects a dark fantasy citadel aesthetic:

```css
:root {
  /* Surface colors */
  --bg-dark: #0b0f19;
  --bg: #0f1420;
  --panel: #171e2e;
  --panel-hover: #1e273b;
  --panel-border: #2a3449;
  
  /* Text & Typography */
  --text: #e6e9f0;
  --text-bright: #ffffff;
  --muted: #8b94a8;
  --font-sans: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;

  /* Accent & Tactical colors */
  --accent: #4cc9f0;
  --accent-glow: rgba(76, 201, 240, 0.25);
  --accent-hover: #3ab0d6;
  
  /* Status indicators */
  --ok: #06d6a0;
  --ok-bg: rgba(6, 214, 160, 0.1);
  --warn: #ffd166;
  --warn-bg: rgba(255, 209, 102, 0.12);
  --danger: #ef476f;
  --danger-bg: rgba(239, 71, 111, 0.15);

  /* Layout */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --transition-fast: 150ms ease;
}
```

### 3.2 Component Style Guide

#### Tabs Navigation
- Subtle border-bottom divider (`--panel-border`).
- Inactive tabs in `--muted` text, transitioning to `--text` on hover.
- Active tab underlined with `--accent` and luminous accent color.

#### Button Styles
- **Primary Action (Play, Confirm):** Background `--accent`, text dark `--bg-dark`, subtle glow on hover.
- **Secondary (Back, Next, Reset):** Background `--panel-border`, text `--text`, border subtle.
- **Disabled State:** Opacity 0.4, cursor `not-allowed`.

#### Step Scrubber (Timeline Slider)
- Clean dark track (`--panel-border`).
- Glowing accent thumb (`--accent`).
- Full width responsive bar.

#### Form Controls (Scenario Panel)
- Inputs styled with dark background `--bg-dark`, border `--panel-border`, focus ring `--accent`.
- Numeric steppers compact and tabular.
