import React from "react";

// Scenario editor panel (Part 6). Skeleton: shows the scenario; editing updates every tab via onChange.
export default function ScenarioPanel({ scenario, onChange }) {
  if (!scenario) return null;
  return (
    <details className="panel">
      <summary>Scenario ({Object.keys(scenario.nodes).length} nodes, {Object.keys(scenario.loot).length} loot drops)</summary>
      <p className="todo">TODO Part 6: editable fields for time limit, limits and recipes; call onChange(next).</p>
      <pre>{JSON.stringify(scenario, null, 2)}</pre>
    </details>
  );
}
