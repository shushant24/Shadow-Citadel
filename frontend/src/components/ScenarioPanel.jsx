import React, { useState, useEffect, useCallback } from "react";

const RECIPE_ITEMS = [
  { id: "x1", name: "x1 Health potion" },
  { id: "x2", name: "x2 Stamina potion" },
  { id: "x3", name: "x3 Damage elixir" },
  { id: "x4", name: "x4 Shield scroll" },
];

const RECIPE_ATTRS = [
  { key: "score", label: "Score / unit", min: 0, integer: false },
  { key: "time", label: "Craft time (min)", min: 1, integer: true },
  { key: "weight", label: "Weight (kg)", min: 0, integer: false },
  { key: "stamina", label: "Stamina cost", min: 0, integer: false },
  { key: "survival", label: "Survival points", min: 0, integer: false },
];

/**
 * Scenario editor panel (Part 6).
 * Allows live editing of raid time limit, crafting limits, and item recipes.
 * Propagates updates via onChange(nextScenario).
 *
 * Uses a draft-string approach for total_time so users can freely backspace,
 * clear, and retype values without the input snapping back on every keystroke.
 * Values are committed on blur or Enter.
 */
export default function ScenarioPanel({ scenario, onChange, onReset, isEdited = false }) {
  const [showRaw, setShowRaw] = useState(false);
  // Draft string for total_time — allows free typing; commits on blur/Enter
  const [timeDraft, setTimeDraft] = useState(String(scenario?.total_time ?? ""));

  // Keep draft in sync when scenario.total_time changes externally (e.g. reset)
  useEffect(() => {
    setTimeDraft(String(scenario?.total_time ?? ""));
  }, [scenario?.total_time]);

  if (!scenario) return null;

  const commitTotalTime = useCallback(() => {
    const raw = timeDraft.trim();
    if (raw === "") {
      // Revert to current value
      setTimeDraft(String(scenario?.total_time ?? ""));
      return;
    }
    const num = Number(raw);
    if (!Number.isFinite(num) || num < 1) {
      setTimeDraft(String(scenario?.total_time ?? ""));
      return;
    }
    const val = Math.floor(num);
    if (val !== scenario?.total_time) {
      onChange?.({
        ...scenario,
        total_time: val,
      });
    }
    setTimeDraft(String(val));
  }, [timeDraft, scenario, onChange]);

  const handleLimitChange = (key, rawValue, min = 0, isInt = false) => {
    const raw = String(rawValue).trim();
    if (raw === "") return;
    const num = Number(raw);
    if (!Number.isFinite(num) || num < min) return;
    const val = isInt ? Math.floor(num) : num;
    onChange?.({
      ...scenario,
      limits: {
        ...scenario.limits,
        [key]: val,
      },
    });
  };

  const handleRecipeChange = (attr, itemIndex, rawValue, min = 0, isInt = false) => {
    const raw = String(rawValue).trim();
    if (raw === "") return;
    const num = Number(raw);
    if (!Number.isFinite(num) || num < min) return;
    const val = isInt ? Math.floor(num) : num;
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
          Scenario ({nodeCount} nodes, {lootCount} loot drops)
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
              step="1"
              value={timeDraft}
              onChange={(e) => setTimeDraft(e.target.value)}
              onBlur={commitTotalTime}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitTotalTime();
              }}
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
                value={scenario.limits?.weight ?? ""}
                onChange={(e) => handleLimitChange("weight", e.target.value, 0, false)}
                className="form-input num-input"
              />
            </div>
            <div className="form-group">
              <label htmlFor="limit-stamina">Max Stamina Cost (≤):</label>
              <input
                id="limit-stamina"
                type="number"
                min="0"
                value={scenario.limits?.stamina ?? ""}
                onChange={(e) => handleLimitChange("stamina", e.target.value, 0, false)}
                className="form-input num-input"
              />
            </div>
            <div className="form-group">
              <label htmlFor="limit-survival">Min Survival Points (≥):</label>
              <input
                id="limit-survival"
                type="number"
                min="0"
                value={scenario.limits?.survival_min ?? ""}
                onChange={(e) => handleLimitChange("survival_min", e.target.value, 0, false)}
                className="form-input num-input"
              />
            </div>
            <div className="form-group">
              <label htmlFor="limit-slots">Required Slots (=):</label>
              <input
                id="limit-slots"
                type="number"
                min="1"
                step="1"
                value={scenario.limits?.slots ?? ""}
                onChange={(e) => handleLimitChange("slots", e.target.value, 1, true)}
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
                      const val = scenario.recipes?.[a.key]?.[idx] ?? "";
                      const inputId = `recipe-${item.id}-${a.key}`;
                      return (
                        <td key={a.key}>
                          <input
                            id={inputId}
                            aria-label={`${item.name} ${a.label}`}
                            type="number"
                            min={a.min}
                            step={a.integer ? "1" : "any"}
                            value={val}
                            onChange={(e) =>
                              handleRecipeChange(a.key, idx, e.target.value, a.min, a.integer)
                            }
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
