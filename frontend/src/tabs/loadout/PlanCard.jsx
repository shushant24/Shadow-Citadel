import React from "react";
import { formatNum } from "./formatBigM";

const RECIPE_META = [
  { name: "Health Potion", varName: "x1", icon: "🧪", baseScore: 8 },
  { name: "Stamina Potion", varName: "x2", icon: "⚡", baseScore: 6 },
  { name: "Damage Elixir", varName: "x3", icon: "⚔️", baseScore: 10 },
  { name: "Shield Scroll", varName: "x4", icon: "🛡️", baseScore: 7 },
];

export default function PlanCard({ answer, combatScore = 445, recipes }) {
  if (!answer) return null;

  const x = answer.x ?? [];
  const z = answer.z ?? 0;
  const totalScore = typeof z === "number" && typeof combatScore === "number" ? combatScore + z : null;
  const totalItems = x.reduce((acc, val) => acc + (typeof val === "number" ? val : 0), 0);

  return (
    <div className="loadout-plan-section">
      {/* 3 Overview Stat Cards */}
      <div className="loadout-stats-grid" aria-label="Raid Scores Summary">
        <div className="stat-card loadout-stat-card">
          <span className="stat-label">Crafting Bonus (Z)</span>
          <div className="stat-value loadout-score-crafting">{formatNum(z)}</div>
          <span className="stat-subtext">Optimal Simplex allocation</span>
        </div>

        <div className="stat-card loadout-stat-card">
          <span className="stat-label">Combat Score</span>
          <div className="stat-value loadout-score-combat">{formatNum(combatScore)}</div>
          <span className="stat-subtext">Stage 3 Hungarian assignment</span>
        </div>

        <div className="stat-card loadout-stat-card loadout-card-total">
          <span className="stat-label">Total Raid Score</span>
          <div className="stat-value loadout-score-total">
            {totalScore !== null ? formatNum(totalScore) : "-"}
          </div>
          <span className="stat-subtext">Combat + Crafting bonus</span>
        </div>
      </div>

      {/* 4 Recipe Allocation Cards */}
      <div className="loadout-recipes-container">
        <div className="loadout-section-header">
          <h3>Crafting Allocation Plan</h3>
          <span className="loadout-header-tag">
            Total Items: <strong>{formatNum(totalItems)}</strong> / 14 Slots
          </span>
        </div>

        <div className="loadout-recipes-grid" aria-label="Crafting Recipes">
          {RECIPE_META.map((meta, i) => {
            const count = x[i] ?? 0;
            const scorePerUnit = recipes?.score?.[i] ?? meta.baseScore;
            const itemTotalScore = count * scorePerUnit;
            const timePerUnit = recipes?.time?.[i];
            const weightPerUnit = recipes?.weight?.[i];
            const stamPerUnit = recipes?.stamina?.[i];
            const survPerUnit = recipes?.survival?.[i];

            return (
              <div
                key={meta.varName}
                className={`loadout-recipe-card ${count > 0 ? "active-recipe" : "zero-recipe"}`}
                data-testid={`recipe-card-${meta.varName}`}
              >
                <div className="recipe-card-top">
                  <span className="recipe-icon">{meta.icon}</span>
                  <div className="recipe-title-group">
                    <span className="recipe-name">{meta.name}</span>
                    <span className="recipe-var-badge">{meta.varName}</span>
                  </div>
                </div>

                <div className="recipe-card-count">
                  <span className="recipe-count-number">{formatNum(count)}</span>
                  <span className="recipe-count-label">units</span>
                </div>

                <div className="recipe-score-earned">
                  +{formatNum(itemTotalScore)} pts{" "}
                  <span className="recipe-unit-score">({scorePerUnit} pts/ea)</span>
                </div>

                <div className="recipe-stats-footer">
                  {timePerUnit !== undefined && <span>⏱️ {timePerUnit}m</span>}
                  {weightPerUnit !== undefined && <span>⚖️ {weightPerUnit}kg</span>}
                  {stamPerUnit !== undefined && <span>⚡ {stamPerUnit}</span>}
                  {survPerUnit !== undefined && <span>🛡️ {survPerUnit}</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
