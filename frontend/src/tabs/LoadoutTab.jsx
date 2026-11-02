// LoadoutTab.jsx — Stage 4: Consumable Crafting Optimizer (Part 9).
// Solves Simplex LP (Big-M & Two-Phase), displays allocation plan,
// resource meters, sensitivity analysis shadow prices, and StepPlayer tableaux.

import React, { useState, useEffect, useMemo, useRef } from "react";
import { api, USE_FIXTURES } from "../api.js";
import Status from "../components/Status.jsx";
import StepPlayer from "../components/StepPlayer.jsx";
import PlanCard from "./loadout/PlanCard.jsx";
import ResourceMeters from "./loadout/ResourceMeters.jsx";
import SensitivityPanel from "./loadout/SensitivityPanel.jsx";
import TableauView from "./loadout/TableauView.jsx";

export default function LoadoutTab({ scenario }) {
  const [method, setMethod] = useState("bigm");
  const [showTableau, setShowTableau] = useState(true);

  // 1. Live Tour Time & Combat Score from api.pipeline
  const [livePipeline, setLivePipeline] = useState(null);

  useEffect(() => {
    let active = true;
    api.pipeline(scenario, "optimal")
      .then((res) => {
        if (active && res?.answer) {
          setLivePipeline(res.answer);
        }
      })
      .catch(() => {
        // Fallback gracefully to fixture defaults if offline / pipeline unavailable
      });
    return () => {
      active = false;
    };
  }, [scenario]);

  const liveTourTime = livePipeline?.tour_time ?? 70;
  const liveCombatScore = livePipeline?.combat ?? 445;

  // 2. Derive crafting time from scenario.total_time minus live tour time
  const derivedCraftTime = Math.max(0, (scenario?.total_time ?? 120) - liveTourTime);

  // Custom slider override
  const [customTime, setCustomTime] = useState(null);
  const activeCraftTime = customTime ?? derivedCraftTime;

  // Slider draft state for smooth UI interaction and 200ms debounce
  const [sliderDraft, setSliderDraft] = useState(activeCraftTime);

  useEffect(() => {
    setSliderDraft(activeCraftTime);
  }, [activeCraftTime]);

  // Reset custom time override when scenario.total_time or tour time changes
  useEffect(() => {
    setCustomTime(null);
  }, [scenario?.total_time, liveTourTime]);

  // 200ms debounce on slider change to avoid spamming api.craft
  useEffect(() => {
    if (sliderDraft === activeCraftTime) return;
    const timer = setTimeout(() => {
      setCustomTime(sliderDraft);
    }, 200);
    return () => clearTimeout(timer);
  }, [sliderDraft, activeCraftTime]);

  // 3. Local limit overrides (weight, stamina, survival, slots)
  const [customLimits, setCustomLimits] = useState({});

  useEffect(() => {
    setCustomLimits({});
  }, [scenario?.limits]);

  const activeLimits = useMemo(() => ({
    weight: customLimits.weight ?? scenario?.limits?.weight ?? 40,
    stamina: customLimits.stamina ?? scenario?.limits?.stamina ?? 90,
    survival_min: customLimits.survival_min ?? scenario?.limits?.survival_min ?? 30,
    slots: customLimits.slots ?? scenario?.limits?.slots ?? 14,
  }), [customLimits, scenario?.limits]);

  const hasLimitOverrides = Object.keys(customLimits).length > 0;

  // Dynamic minimum craft time calculation for infeasibility diagnosis
  const slotsLimit = activeLimits.slots;
  const recipeTimes = scenario?.recipes?.time ?? [3, 4, 5, 3];
  const minRecipeTime = recipeTimes.length > 0 ? Math.min(...recipeTimes) : 3;
  const minCraftTimeNeeded = slotsLimit * minRecipeTime;

  // Request state
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const activeReqIdRef = useRef(0);

  const fetchCraft = async (tLimit, mth, lmts) => {
    const reqId = ++activeReqIdRef.current;
    setLoading(true);
    setError(null);

    try {
      const res = await api.craft({
        time_limit: tLimit,
        recipes: scenario?.recipes,
        limits: lmts,
        method: mth,
      });
      if (reqId === activeReqIdRef.current) {
        setData(res);
      }
    } catch (err) {
      if (reqId === activeReqIdRef.current) {
        setError(err.message || "Failed to solve crafting LP");
      }
    } finally {
      if (reqId === activeReqIdRef.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchCraft(activeCraftTime, method, activeLimits);
  }, [activeCraftTime, method, scenario?.recipes, activeLimits]);

  // Presets
  const applyPreset = (presetTime, presetMethod = "bigm") => {
    setCustomTime(presetTime);
    setSliderDraft(presetTime);
    setMethod(presetMethod);
  };

  const isOptimalPreset = activeCraftTime === 50 && method === "bigm";
  const isBoundaryPreset = activeCraftTime === 42 && method === "bigm";
  const isInfeasiblePreset = activeCraftTime === 40 && method === "bigm";
  const isTwoPhasePreset = activeCraftTime === 50 && method === "twophase";

  const isCustomTimeActive = customTime !== null && customTime !== derivedCraftTime;

  // In fixture mode, canned data is solved at 50 min, 42 min, or 40 min
  const effectiveTimeLimit = USE_FIXTURES
    ? (data?.answer?.z === 111 ? 42 : 50)
    : activeCraftTime;

  return (
    <section className="panel loadout-panel" aria-label="Loadout">
      {/* Header bar matching Matchups & Map tabs */}
      <div className="panel-header">
        <div>
          <h2>Loadout</h2>
          <p className="subtitle">Stage 4: Consumable Crafting & Simplex LP Optimization</p>
        </div>

        {/* Method Switch: Big-M vs Two-Phase */}
        <div className="segmented-tabs" role="group" aria-label="Simplex Method">
          <button
            type="button"
            className={`segment-tab ${method === "bigm" ? "active" : ""}`}
            onClick={() => setMethod("bigm")}
            data-testid="method-bigm"
          >
            Big-M Simplex
          </button>
          <button
            type="button"
            className={`segment-tab ${method === "twophase" ? "active" : ""}`}
            onClick={() => setMethod("twophase")}
            data-testid="method-twophase"
          >
            Two-Phase Simplex
          </button>
        </div>
      </div>

      {/* Preset Buttons & Controls */}
      <div className="loadout-controls-card">
        <div className="loadout-presets-row">
          <span className="presets-label">Quick Scenarios:</span>
          <div className="presets-btn-group">
            <button
              type="button"
              className={`pill-btn ${isOptimalPreset ? "active" : ""}`}
              onClick={() => applyPreset(50, "bigm")}
              data-testid="preset-optimal"
            >
              Optimal (50 min, Z=117)
            </button>
            <button
              type="button"
              className={`pill-btn ${isBoundaryPreset ? "active" : ""}`}
              onClick={() => applyPreset(42, "bigm")}
              data-testid="preset-boundary"
            >
              Tight Boundary (42 min, Z=111)
            </button>
            <button
              type="button"
              className={`pill-btn ${isInfeasiblePreset ? "active" : ""}`}
              onClick={() => applyPreset(40, "bigm")}
              data-testid="preset-infeasible"
            >
              Naive Route Infeasible (40 min)
            </button>
            <button
              type="button"
              className={`pill-btn ${isTwoPhasePreset ? "active" : ""}`}
              onClick={() => applyPreset(50, "twophase")}
              data-testid="preset-twophase"
            >
              Two-Phase Trace (50 min)
            </button>
          </div>
        </div>

        {/* Time Slider Panel */}
        <div className="loadout-slider-container">
          <div className="slider-header-row">
            <label htmlFor="craft-time-slider" className="slider-label">
              <strong>Available Crafting Time:</strong>{" "}
              <span className="slider-val-highlight">{sliderDraft} minutes</span>
              {sliderDraft < minCraftTimeNeeded && (
                <span className="slider-warn-tag"> (Infeasible Region: &lt; {minCraftTimeNeeded} min)</span>
              )}
              {isCustomTimeActive && (
                <span className="slider-override-tag"> (Manual Slider Override)</span>
              )}
            </label>

            {isCustomTimeActive && (
              <button
                type="button"
                className="btn btn-xs btn-secondary"
                onClick={() => {
                  setCustomTime(null);
                  setSliderDraft(derivedCraftTime);
                }}
                data-testid="btn-reset-time"
              >
                Reset to Scenario Time ({derivedCraftTime} min)
              </button>
            )}
          </div>

          <input
            id="craft-time-slider"
            type="range"
            min={30}
            max={70}
            step={1}
            value={sliderDraft}
            onChange={(e) => setSliderDraft(Number(e.target.value))}
            className="step-scrubber loadout-time-slider"
            aria-label="Available Crafting Time Slider"
          />

          <div className="slider-ticks-row">
            <span>30 min</span>
            <span className="tick-infeasible">40 min (Naive Route)</span>
            <span className="tick-boundary">42 min (Min Feasible)</span>
            <span className="tick-optimal">50 min (Optimal)</span>
            <span>70 min</span>
          </div>
        </div>

        {/* Constraint Limits Overrides (Weight, Slots, Stamina, Survival) */}
        <div className="loadout-limits-bar">
          <span className="limits-bar-label">Constraint Limits:</span>
          <div className="loadout-limits-inputs">
            <div className="limit-input-group">
              <label htmlFor="limit-input-weight">Weight (kg):</label>
              <input
                id="limit-input-weight"
                aria-label="Max Weight"
                type="number"
                min="0"
                step="any"
                className="form-input form-input-sm"
                value={activeLimits.weight}
                onChange={(e) =>
                  setCustomLimits((prev) => ({ ...prev, weight: Number(e.target.value) }))
                }
              />
            </div>

            <div className="limit-input-group">
              <label htmlFor="limit-input-slots">Slots:</label>
              <input
                id="limit-input-slots"
                aria-label="Max Slots"
                type="number"
                min="1"
                step="1"
                className="form-input form-input-sm"
                value={activeLimits.slots}
                onChange={(e) =>
                  setCustomLimits((prev) => ({ ...prev, slots: Number(e.target.value) }))
                }
              />
            </div>

            <div className="limit-input-group">
              <label htmlFor="limit-input-stamina">Stamina:</label>
              <input
                id="limit-input-stamina"
                aria-label="Max Stamina"
                type="number"
                min="0"
                step="any"
                className="form-input form-input-sm"
                value={activeLimits.stamina}
                onChange={(e) =>
                  setCustomLimits((prev) => ({ ...prev, stamina: Number(e.target.value) }))
                }
              />
            </div>

            <div className="limit-input-group">
              <label htmlFor="limit-input-survival">Survival Min:</label>
              <input
                id="limit-input-survival"
                aria-label="Min Survival"
                type="number"
                min="0"
                step="any"
                className="form-input form-input-sm"
                value={activeLimits.survival_min}
                onChange={(e) =>
                  setCustomLimits((prev) => ({ ...prev, survival_min: Number(e.target.value) }))
                }
              />
            </div>

            {hasLimitOverrides && (
              <button
                type="button"
                className="btn btn-xs btn-secondary"
                onClick={() => setCustomLimits({})}
                data-testid="btn-reset-limits"
              >
                Reset Limits
              </button>
            )}
          </div>
        </div>

        {/* Fixture mode notice if arbitrary slider chosen in fixture mode */}
        {USE_FIXTURES && activeCraftTime !== 50 && activeCraftTime !== 42 && activeCraftTime !== 40 && (
          <div className="alert alert-info loadout-fixture-hint">
            <strong>Fixture mode active:</strong> The nearest recorded run is displayed. Connect the live API (<code>VITE_USE_FIXTURES=false</code>) to solve arbitrary limits.
          </div>
        )}
      </div>

      {/* Main Status & Results Area */}
      <Status loading={loading} error={error} result={data}>
        {/* INFEASIBLE CASE */}
        {data?.status === "infeasible" && (
          <div className="loadout-infeasible-card" data-testid="infeasible-card">
            <div className="infeasible-card-header">
              <span className="alert-icon">⚠️</span>
              <h4>Crafting Plan Infeasible ({activeCraftTime} min available)</h4>
            </div>

            <p className="infeasible-message">
              {data.answer?.message ||
                "With the remaining crafting time, the loadout cannot satisfy all constraints."}
            </p>

            <div className="infeasible-explanation">
              <strong>Mathematical Reason:</strong>{" "}
              {activeCraftTime < minCraftTimeNeeded ? (
                <>
                  The inventory capacity constraint requires filling all {slotsLimit} slots.
                  Even crafting the fastest possible recipe ({minRecipeTime} min per item), the minimum crafting time
                  required is {minCraftTimeNeeded} minutes ({slotsLimit} slots × {minRecipeTime} min/item). With only {activeCraftTime} minutes
                  available, no valid combination of recipes can satisfy the inventory capacity requirement.
                </>
              ) : (
                <>The constraints conflict at this time: check the weight, stamina, survival and slot limits.</>
              )}
            </div>

            <div className="infeasible-action-hint">
              <strong>Recommendation:</strong>{" "}
              {activeCraftTime < minCraftTimeNeeded ? (
                <>
                  Increase available crafting time to at least {minCraftTimeNeeded} minutes by choosing a faster raid route or extending the total raid time limit in the scenario overview.
                </>
              ) : (
                <>
                  Check and relax the conflicting constraint limits (e.g. increase carry weight, reduce required survival points, or adjust inventory slots) so a feasible recipe combination exists.
                </>
              )}
            </div>
          </div>
        )}

        {/* OPTIMAL CASE */}
        {data?.status === "optimal" && (
          <div className="loadout-optimal-results">
            {/* 1. Score Stats & Allocation Plan Cards */}
            <PlanCard
              answer={data.answer}
              combatScore={liveCombatScore}
              recipes={scenario?.recipes}
              limits={activeLimits}
            />

            {/* 2. Resource Consumption Meters */}
            <ResourceMeters
              answer={data.answer}
              timeLimit={effectiveTimeLimit}
              limits={activeLimits}
              recipes={scenario?.recipes}
            />

            {/* 3. Sensitivity Analysis & Shadow Prices */}
            <SensitivityPanel answer={data.answer} />
          </div>
        )}

        {/* 4. Simplex Tableaux Stepper Replay (rendered for both Optimal and Infeasible) */}
        {data?.steps && data.steps.length > 0 && (
          <div className="loadout-stepper-section">
            <div className="loadout-stepper-header">
              <div>
                <h3>Simplex Tableaux Pivoting Trace</h3>
                <p className="stepper-subtitle">
                  Step-by-step pivots with entering variable, leaving variable, and pivot cell highlighted.
                </p>
              </div>

              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={() => setShowTableau((prev) => !prev)}
                data-testid="toggle-tableau-btn"
              >
                {showTableau ? "Hide Tableaux" : "Show Tableaux"}
              </button>
            </div>

            {showTableau && (
              <StepPlayer steps={data.steps} initialSpeedMs={800}>
                {(currentStep, currentIndex) => (
                  <TableauView
                    step={currentStep}
                    isBigM={method === "bigm"}
                  />
                )}
              </StepPlayer>
            )}
          </div>
        )}
      </Status>
    </section>
  );
}
