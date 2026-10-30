import React, { useState } from "react";

const RECIPE_ITEMS = [
  { id: "x1", name: "x1 Health potion" },
  { id: "x2", name: "x2 Stamina potion" },
  { id: "x3", name: "x3 Damage elixir" },
  { id: "x4", name: "x4 Shield scroll" },
];

const RECIPE_ATTRS = [
  { key: "score", label: "Score / unit", min: 0 },
  { key: "time", label: "Craft time (min)", min: 1 },
  { key: "weight", label: "Weight (kg)", min: 0 },
  { key: "stamina", label: "Stamina cost", min: 0 },
  { key: "survival", label: "Survival points", min: 0 },
];

/**
 * Scenario editor panel (Part 6).
 * Allows live editing of raid time limit, crafting limits, and item recipes.
 * Propagates updates via onChange(nextScenario).
 */
export default function ScenarioPanel({ scenario, onChange, onReset, isEdited = false }) {
  const [showRaw, setShowRaw] = useState(false);

  if (!scenario) return null;

  const handleTotalTimeChange = (e) => {
    const val = Number(e.target.value);
    if (isNaN(val) || val < 0) return;
    onChange?.({
      ...scenario,
      total_time: val,
    });
  };

  const handleLimitChange = (key, value) => {
    const val = Number(value);
    if (isNaN(val) || val < 0) return;
    onChange?.({
      ...scenario,
      limits: {
        ...scenario.limits,
        [key]: val,
      },
    });
  };

  const handleRecipeChange = (attr, itemIndex, value) => {
    const val = Number(value);
    if (isNaN(val) || val < 0) return;
    const currentList = scenario.recipes?.[attr] || [];
    const nextList = [...currentList];
    nextList[itemIndex] = val;
    onChange?.({
      ...scenario,
      recipes: {
        ...scenario.recipes,
        [attr]: nextList,
      },
    });
  };

  const nodeCount = scenario.nodes ? Object.keys(scenario.nodes).length : 0;
  const lootCount = scenario.loot ? Object.keys(scenario.loot).length : 0;

  return (
    <details className="panel scenario-panel" open>
      <summary className="scenario-summary">
        <span className="scenario-title">
          Scenario Configuration ({nodeCount} nodes, {lootCount} loot drops)
        </span>
        {isEdited && <span className="badge badge-warn">Modified</span>}
        {onReset && (
          <button
            type="button"
            className="btn btn-sm btn-secondary reset-btn"
            onClick={(e) => {
              e.preventDefault();
              onReset();
            }}
            disabled={!isEdited}
            title="Reset scenario to default values"
          >
            Reset to Defaults
          </button>
        )}
      </summary>

      <div className="scenario-body">
        {/* Raid Time Overview */}
        <section className="scenario-section">
          <h3>Raid Overview</h3>
          <div className="form-group inline-group">
            <label htmlFor="input-total-time">
              Raid Time Limit (min):
            </label>
            <input
              id="input-total-time"
              type="number"
              min="1"
              value={scenario.total_time ?? 120}
              onChange={handleTotalTimeChange}
              className="form-input num-input"
            />
          </div>
        </section>

        {/* Inventory and Resource Limits */}
        <section className="scenario-section">
          <h3>Inventory & Crafting Limits</h3>
          <div className="limits-grid">
            <div className="form-group">
              <label htmlFor="limit-weight">Max Weight (kg, ≤):</label>
              <input
                id="limit-weight"
                type="number"
                min="0"
                value={scenario.limits?.weight ?? 40}
                onChange={(e) => handleLimitChange("weight", e.target.value)}
                className="form-input num-input"
              />
            </div>
            <div className="form-group">
              <label htmlFor="limit-stamina">Max Stamina Cost (≤):</label>
              <input
                id="limit-stamina"
                type="number"
                min="0"
                value={scenario.limits?.stamina ?? 90}
                onChange={(e) => handleLimitChange("stamina", e.target.value)}
                className="form-input num-input"
              />
            </div>
            <div className="form-group">
              <label htmlFor="limit-survival">Min Survival Points (≥):</label>
              <input
                id="limit-survival"
                type="number"
                min="0"
                value={scenario.limits?.survival_min ?? 30}
                onChange={(e) => handleLimitChange("survival_min", e.target.value)}
                className="form-input num-input"
              />
            </div>
            <div className="form-group">
              <label htmlFor="limit-slots">Required Slots (=):</label>
              <input
                id="limit-slots"
                type="number"
                min="1"
                value={scenario.limits?.slots ?? 14}
                onChange={(e) => handleLimitChange("slots", e.target.value)}
                className="form-input num-input"
              />
            </div>
          </div>
        </section>

        {/* Crafting Recipes Table */}
        <section className="scenario-section">
          <h3>Crafting Recipes</h3>
          <div className="table-responsive">
            <table className="scenario-table">
              <thead>
                <tr>
                  <th>Item</th>
                  {RECIPE_ATTRS.map((a) => (
                    <th key={a.key}>{a.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {RECIPE_ITEMS.map((item, idx) => (
                  <tr key={item.id}>
                    <td className="item-name">{item.name}</td>
                    {RECIPE_ATTRS.map((a) => {
                      const val = scenario.recipes?.[a.key]?.[idx] ?? 0;
                      const inputId = `recipe-${item.id}-${a.key}`;
                      return (
                        <td key={a.key}>
                          <input
                            id={inputId}
                            aria-label={`${item.name} ${a.label}`}
                            type="number"
                            min={a.min}
                            value={val}
                            onChange={(e) => handleRecipeChange(a.key, idx, e.target.value)}
                            className="form-input num-input table-input"
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Optional Raw JSON view */}
        <section className="scenario-section raw-json-section">
          <button
            type="button"
            className="btn btn-sm btn-link"
            onClick={() => setShowRaw(!showRaw)}
          >
            {showRaw ? "Hide Raw JSON" : "Show Raw JSON"}
          </button>
          {showRaw && (
            <pre className="json-dump" data-testid="scenario-json-dump">
              {JSON.stringify(scenario, null, 2)}
            </pre>
          )}
        </section>
      </div>
    </details>
  );
}
