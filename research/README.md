# Part 6 Research Index: App Shell and Shared Components

This directory contains the complete research, architectural design, component specifications, and step-by-step implementation plan for **Part 6** of the **Shadow Citadel Raid Optimizer** project.

---

## Quick Navigation

| Document | Topic | Description |
|---|---|---|
| [01. Requirements & Contract Analysis](01_requirements_and_contract_analysis.md) | Specs & Rules | Deep dive into `parts.md`, `demo_plan.md`, `api-contract.md`, `decisions.md`, and project constraints. |
| [02. Component Architecture & Data Flow](02_component_architecture_and_data_flow.md) | System Design | Architecture of the App shell, state propagation, tab lifecycle, and API client layer. |
| [03. Scenario Panel Specification](03_scenario_panel_specification.md) | Component Spec | Full UI/UX specification and schema mapping for the editable `ScenarioPanel`. |
| [04. Reusable Step Player Specification](04_step_player_specification.md) | Component Spec | Multi-tab replay engine supporting Branch & Bound, Hungarian reduction/covering, and Simplex tableaux. |
| [05. Status & Theme Design System](05_status_and_theme_specification.md) | Styling & UX | Envelope status handling (infeasible/unbounded), alert roles, and dark gaming aesthetic in `theme.css`. |
| [06. Testing Strategy & QA](06_testing_strategy_and_quality_assurance.md) | Verification | Vitest + Testing Library test matrix, edge cases, contract assertions, and CI checks. |
| [07. Step-by-Step Execution Plan](07_step_by_step_execution_plan.md) | Roadmap | Phased implementation roadmap with milestones, deliverables, and PR submission checklist. |

---

## Executive Summary of Part 6

- **Owner Deliverable:**
  - `frontend/src/App.jsx`
  - `frontend/src/api.js`
  - `frontend/src/components/StepPlayer.jsx`
  - `frontend/src/components/ScenarioPanel.jsx`
  - `frontend/src/components/Status.jsx`
  - `frontend/src/useApi.js`
  - `frontend/src/theme.css`
- **Primary Done-When Criteria (`docs/parts.md`):**
  > "Any tab can plug in a step list and get a working player; editing the scenario updates every tab (`App` already holds the edited scenario; `ScenarioPanel` needs the editable fields); `Status` shows infeasible messages."
- **Paired Reviewers:** Part 5 (Backend pipeline / geometry), and all Frontend owners (Parts 7, 8, 9, 10).
- **Core Philosophy:** Part 6 serves as the structural foundation for the entire frontend application. It must be rock-solid, decoupled, responsive, and provide clean abstractions so that Parts 7, 8, 9, and 10 can develop in parallel without blocking each other.
