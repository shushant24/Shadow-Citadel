import React, { useState, useEffect } from "react";

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
 * Reusable numeric input with internal draft string state.
 * Allows users to freely backspace, clear, and retype values without the input
 * immediately snapping back on invalid keystrokes.
 * Validates and commits on blur or Enter; reverts to last valid value if invalid.
 */
function NumberField({
  id,
  label,
  value,
  min = 0,
  integer = false,
  onChange,
  className = "form-input num-input",
}) {
  const [draft, setDraft] = useState(String(value ?? ""));

  useEffect(() => {
    setDraft(String(value ?? ""));
  }, [value]);

  const commit = () => {
    const raw = String(draft).trim();
    if (raw === "") {
      setDraft(String(value ?? ""));
      return;
    }
    const num = Number(raw);
    if (!Number.isFinite(num) || num < min) {
      setDraft(String(value ?? ""));
      return;
    }
    const val = integer ? Math.floor(num) : num;
    if (val !== value) {
      onChange?.(val);
    }
    setDraft(String(val));
  };

  return (
    <input
      id={id}
      aria-label={label}
      type="number"
      min={min}
      step={integer ? "1" : "any"}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          if (document.activeElement === e.currentTarget) {
            e.currentTarget.blur();
          } else {
            commit();
          }
        }
      }}
      className={className}
    />
  );
}

/**
 * Scenario editor panel (Part 6).
 * Allows live editing of raid time limit, crafting limits, and item recipes.
 * Propagates updates via onChange(nextScenario).
 */
export default function ScenarioPanel({ scenario, onChange, onReset, isEdited = false }) {
  const [showRaw, setShowRaw] = useState(false);

  // Early return when scenario is null (placed after the sole useState hook,
  // ensuring identical hook count across all renders to obey Rules of Hooks)
  if (!scenario) return null;

  const handleLimitChange = (key, val) => {
    onChange?.({
      ...scenario,
      limits: {
        ...scenario.limits,
        [key]: val,
      },
    });
  };

  const handleRecipeChange = (attr, itemIndex, val) => {
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
            <NumberField
              id="input-total-time"
              label="Raid Time Limit"
              value={scenario.total_time}
              min={1}
              integer={true}
              onChange={(val) =>
                onChange?.({
                  ...scenario,
                  total_time: val,
                })
              }
            />
          </div>
        </section>

        {/* Inventory and Resource Limits */}
        <section className="scenario-section">
          <h3>Inventory & Crafting Limits</h3>
          <div className="limits-grid">
            <div className="form-group">
              <label htmlFor="limit-weight">Max Weight (kg, ≤):</label>
              <NumberField
                id="limit-weight"
                label="Max Weight"
                value={scenario.limits?.weight}
                min={0}
                integer={false}
                onChange={(val) => handleLimitChange("weight", val)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="limit-stamina">Max Stamina Cost (≤):</label>
              <NumberField
                id="limit-stamina"
                label="Max Stamina"
                value={scenario.limits?.stamina}
                min={0}
                integer={false}
                onChange={(val) => handleLimitChange("stamina", val)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="limit-survival">Min Survival Points (≥):</label>
              <NumberField
                id="limit-survival"
                label="Min Survival"
                value={scenario.limits?.survival_min}
                min={0}
                integer={false}
                onChange={(val) => handleLimitChange("survival_min", val)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="limit-slots">Required Slots (=):</label>
              <NumberField
                id="limit-slots"
                label="Required Slots"
                value={scenario.limits?.slots}
                min={1}
                integer={true}
                onChange={(val) => handleLimitChange("slots", val)}
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
                      const val = scenario.recipes?.[a.key]?.[idx];
                      const inputId = `recipe-${item.id}-${a.key}`;
                      return (
                        <td key={a.key}>
                          <NumberField
                            id={inputId}
                            label={`${item.name} ${a.label}`}
                            value={val}
                            min={a.min}
                            integer={a.integer}
                            onChange={(newVal) => handleRecipeChange(a.key, idx, newVal)}
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
