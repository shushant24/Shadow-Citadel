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

// Fixed optimal tour time from Stage 2 Hungarian TSP tour (70 min)
const FIXTURE_OPTIMAL_TOUR_MIN = 70;
const COMBAT_SCORE_DEFAULT = 445;

export default function LoadoutTab({ scenario }) {
  const [method, setMethod] = useState("bigm");
  const [customTime, setCustomTime] = useState(null);
  const [showTableau, setShowTableau] = useState(true);

  // Derive default craft time from scenario.total_time (120 - 70 = 50 min)
  const derivedCraftTime = Math.max(0, (scenario?.total_time ?? 120) - FIXTURE_OPTIMAL_TOUR_MIN);
  const activeCraftTime = customTime ?? derivedCraftTime;

  // Reset custom time override when scenario.total_time is edited in ScenarioPanel
  useEffect(() => {
    setCustomTime(null);
  }, [scenario?.total_time]);

  // Request state
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const activeReqIdRef = useRef(0);

  const fetchCraft = async (tLimit, mth) => {
    const reqId = ++activeReqIdRef.current;
    setLoading(true);
    setError(null);

    try {
      const res = await api.craft({
        time_limit: tLimit,
        recipes: scenario?.recipes,
        limits: scenario?.limits,
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
    fetchCraft(activeCraftTime, method);
  }, [activeCraftTime, method, scenario?.recipes, scenario?.limits]);

  // Presets
  const applyPreset = (presetTime, presetMethod = "bigm") => {
    setCustomTime(presetTime);
    setMethod(presetMethod);
  };

  const isOptimalPreset = activeCraftTime === 50 && method === "bigm";
  const isBoundaryPreset = activeCraftTime === 42 && method === "bigm";
  const isInfeasiblePreset = activeCraftTime === 40 && method === "bigm";
  const isTwoPhasePreset = activeCraftTime === 50 && method === "twophase";

  const isCustomTimeActive = customTime !== null && customTime !== derivedCraftTime;

  return (
    <section className="panel loadout-panel" aria-label="Loadout">
      {/* Tab Header */}
      <div className="loadout-header">
        <div className="loadout-title-block">
          <h2>Stage 4: Consumable Crafting (Simplex LP)</h2>
          <p className="loadout-subtitle">
            Maximize raid bonus score within remaining raid time, carry weight, stamina, survival, and inventory slots.
          </p>
        </div>

        {/* Method Switch: Big-M vs Two-Phase */}
        <div className="segmented loadout-method-switch" role="group" aria-label="Simplex Method">
          <button
            type="button"
            className={`btn-seg ${method === "bigm" ? "active" : ""}`}
            onClick={() => setMethod("bigm")}
            data-testid="method-bigm"
          >
            Big-M Simplex
          </button>
          <button
            type="button"
            className={`btn-seg ${method === "twophase" ? "active" : ""}`}
            onClick={() => setMethod("twophase")}
            data-testid="method-twophase"
          >
            Two-Phase Simplex
          </button>
        </div>
      </div>

      {/* Preset Buttons & Time Slider */}
      <div className="loadout-controls-card">
        <div className="loadout-presets-row">
          <span className="presets-label">Quick Scenarios:</span>
          <div className="presets-btn-group">
            <button
              type="button"
              className={`btn btn-sm ${isOptimalPreset ? "btn-primary" : "btn-secondary"}`}
              onClick={() => applyPreset(50, "bigm")}
              data-testid="preset-optimal"
            >
              ⭐ Optimal (50 min, Z=117)
            </button>
            <button
              type="button"
              className={`btn btn-sm ${isBoundaryPreset ? "btn-primary" : "btn-secondary"}`}
              onClick={() => applyPreset(42, "bigm")}
              data-testid="preset-boundary"
            >
              ⚠️ Tight Boundary (42 min, Z=111)
            </button>
            <button
              type="button"
              className={`btn btn-sm ${isInfeasiblePreset ? "btn-primary" : "btn-secondary"}`}
              onClick={() => applyPreset(40, "bigm")}
              data-testid="preset-infeasible"
            >
              🚫 Naive Route Infeasible (40 min)
            </button>
            <button
              type="button"
              className={`btn btn-sm ${isTwoPhasePreset ? "btn-primary" : "btn-secondary"}`}
              onClick={() => applyPreset(50, "twophase")}
              data-testid="preset-twophase"
            >
              🔄 Two-Phase Trace (50 min)
            </button>
          </div>
        </div>

        {/* Time Slider Panel */}
        <div className="loadout-slider-container">
          <div className="slider-header-row">
            <label htmlFor="craft-time-slider" className="slider-label">
              <strong>Available Crafting Time:</strong>{" "}
              <span className="slider-val-highlight">{activeCraftTime} minutes</span>
              {activeCraftTime < 42 && (
                <span className="slider-warn-tag"> (Infeasible Region: &lt; 42 min)</span>
              )}
              {isCustomTimeActive && (
                <span className="slider-override-tag"> (Manual Slider Override)</span>
              )}
            </label>

            {isCustomTimeActive && (
              <button
                type="button"
                className="btn btn-xs btn-secondary"
                onClick={() => setCustomTime(null)}
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
            value={activeCraftTime}
            onChange={(e) => setCustomTime(Number(e.target.value))}
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

        {/* Fixture mode notice if arbitrary slider chosen in fixture mode */}
        {USE_FIXTURES && activeCraftTime !== 50 && activeCraftTime !== 42 && activeCraftTime !== 40 && (
          <div className="alert alert-info loadout-fixture-hint">
            💡 <strong>Fixture mode active:</strong> The nearest recorded run is displayed. Run backend live (<code>VITE_USE_FIXTURES=false</code>) to solve any arbitrary minute limit.
          </div>
        )}
      </div>

      {/* Main Status & Results Area */}
      <Status loading={loading} error={error} result={data}>
        {/* INFEASIBLE CASE */}
        {data?.status === "infeasible" && (
          <div className="loadout-infeasible-card" data-testid="infeasible-card">
            <div className="infeasible-card-header">
              <span className="infeasible-icon">⚠️</span>
              <h4>Crafting Plan Infeasible ({activeCraftTime} min available)</h4>
            </div>

            <p className="infeasible-message">
              {data.answer?.message ||
                "With the remaining crafting time, the 14-slot loadout cannot satisfy all constraints."}
            </p>

            <div className="infeasible-explanation">
              <strong>Mathematical Reason:</strong> 14 inventory slots require at least 42 minutes to craft (
              <code>14 slots × 3 min = 42 min</code> using the fastest recipe). With only {activeCraftTime} minutes,
              an artificial variable ($a_5$) remains in the final basis at a positive level ({"> 0"}), rendering the plan
              impossible.
            </div>

            <div className="infeasible-action-hint">
              <strong>Recommendation:</strong> Return to the <strong>Map</strong> tab and use the optimal Hungarian TSP route
              (70 min) instead of the naive route (80 min) to unlock 50 minutes of crafting time.
            </div>
          </div>
        )}

        {/* OPTIMAL CASE */}
        {data?.status === "optimal" && (
          <div className="loadout-optimal-results">
            {/* 1. Score Stats & Allocation Plan Cards */}
            <PlanCard
              answer={data.answer}
              combatScore={COMBAT_SCORE_DEFAULT}
              recipes={scenario?.recipes}
            />

            {/* 2. Resource Consumption Meters */}
            <ResourceMeters
              answer={data.answer}
              timeLimit={activeCraftTime}
              limits={scenario?.limits}
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
