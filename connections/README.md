# Master Integration Guide: Connecting All Parts with Part 6

This directory provides the complete, copy-paste-ready technical specifications and integration code to connect all other 9 parts of the **Shadow Citadel Raid Optimizer** to **Part 6 (App Shell and Shared Components)**.

---

## Directory Navigation

| File | Focus | Description |
|---|---|---|
| [**`frontend_tabs_integration.md`**](frontend_tabs_integration.md) | **Parts 7, 8, 9, 10** | Complete templates showing how each tab consumes `{ scenario }`, calls `api.js`, handles envelopes via `<Status>`, and replays steps via `<StepPlayer>`. |
| [**`backend_solvers_integration.md`**](backend_solvers_integration.md) | **Parts 1, 2, 3, 4, 5** | Exact endpoint schemas, envelope structures, step objects, and status messages required by Part 6's API client. |
| [**`pipeline_chaining_and_scenario_sync.md`**](pipeline_chaining_and_scenario_sync.md) | **Cross-Stage Chaining** | How `total_time` from `ScenarioPanel` ripples through the TSP tour into Simplex craft time and triggers infeasibility. |

---

## 1. High-Level Integration Architecture

```mermaid
graph TD
    subgraph Part 6: Core Shell (Live & Ready)
        App[App.jsx]
        ScenarioPanel[ScenarioPanel.jsx]
        StatusComp[Status.jsx]
        StepPlayerComp[StepPlayer.jsx]
        ApiClient[api.js & useApi.js]
    end

    subgraph Frontend Tabs (Plug into Part 6)
        MapTab[Part 7: MapTab.jsx]
        MatchupsTab[Part 8: MatchupsTab.jsx]
        LoadoutTab[Part 9: LoadoutTab.jsx]
        SummaryTab[Part 10: SummaryTab.jsx]
    end

    subgraph Backend Solvers (Supply Part 6 via API)
        B1[Parts 1 & 2: Simplex / Crafting LP]
        B2[Part 3: Hungarian Assignment]
        B3[Part 4: TSP / Branch-and-Bound]
        B4[Part 5: Hull & Pipeline Service]
    end

    %% Wiring
    ScenarioPanel -->|onChange(newScenario)| App
    App ==>|Props: scenario| MapTab
    App ==>|Props: scenario| MatchupsTab
    App ==>|Props: scenario| LoadoutTab
    App ==>|Props: scenario| SummaryTab

    MapTab -.->|Calls api.hull / api.route| ApiClient
    MatchupsTab -.->|Calls api.assign| ApiClient
    LoadoutTab -.->|Calls api.craft| ApiClient
    SummaryTab -.->|Calls api.pipeline| ApiClient

    ApiClient <==>|POST /api/route, /api/hull| B3 & B4
    ApiClient <==>|POST /api/assign| B2
    ApiClient <==>|POST /api/craft| B1
    ApiClient <==>|POST /api/pipeline| B4

    MapTab -->|Embeds| StepPlayerComp
    MatchupsTab -->|Embeds| StepPlayerComp
    LoadoutTab -->|Embeds| StepPlayerComp
    MapTab & MatchupsTab & LoadoutTab & SummaryTab -->|Wraps in| StatusComp
```

---

## 2. Universal Part 6 Contract Checklist

Every part connects to Part 6 by adhering to these four foundational rules:

### Rule 1: The Universal Result Envelope
Every API response and fixture must return:
```json
{
  "status": "optimal" | "infeasible" | "unbounded",
  "answer": { ... },
  "steps": [ ... ]
}
```
- **HTTP Status:** Infeasible and unbounded results return **HTTP 200** (not 4xx/5xx).
- **Human-Readable Message:** When `status !== "optimal"`, `answer.message` must contain a single explanation sentence. [`Status.jsx`](file:///Users/visheshagrawal/Shadow-Citadel/frontend/src/components/Status.jsx) automatically renders this in an accessible warning banner while keeping child visualizations rendered.

### Rule 2: Tab Component Signature
Every tab component in `frontend/src/tabs/` receives a single prop:
```jsx
export default function TabName({ scenario }) { ... }
```
When a user edits any parameter in [`ScenarioPanel.jsx`](file:///Users/visheshagrawal/Shadow-Citadel/frontend/src/components/ScenarioPanel.jsx), `App.jsx` updates its state and passes the updated `scenario` prop to the tab.

### Rule 3: Reusable Data Fetching via `useApi`
All tabs execute their data fetching using:
```jsx
import { useApi } from "../useApi.js";
import { api } from "../api.js";

const { loading, error, data } = useApi(() => api.endpointName(...), [scenario]);
```
Passing `[scenario]` in the dependency array guarantees that any change in `ScenarioPanel` automatically triggers re-fetching/re-calculation.

### Rule 4: Universal Step Playback via `StepPlayer`
Any tab with an ordered sequence of algorithm steps plugs into [`StepPlayer.jsx`](file:///Users/visheshagrawal/Shadow-Citadel/frontend/src/components/StepPlayer.jsx) using the render-prop pattern:
```jsx
<StepPlayer steps={data?.steps || []}>
  {(currentStep, index) => (
    <MyCustomVisualization step={currentStep} index={index} />
  )}
</StepPlayer>
```
`StepPlayer` automatically provides:
- Jump to First (`|<`), Previous (`<`), Play/Pause (`▶/⏸`), Next (`>`), Jump to Last (`>|`).
- Timeline range scrubber slider.
- Speed controls (`Fast 300ms`, `Normal 800ms`, `Slow 1500ms`, and custom input).
- Metadata note/phase/status display.
- Keyboard navigation (`ArrowLeft`, `ArrowRight`, `Space`, `Home`, `End`).
- Automatic index resetting when `steps` change.
