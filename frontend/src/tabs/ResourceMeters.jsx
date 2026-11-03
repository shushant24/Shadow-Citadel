import React from "react";
import { formatNum } from "./formatBigM";

export default function ResourceMeters({ answer, timeLimit, limits, recipes }) {
  if (!answer) return null;

  const x = answer.x ?? [];
  const bindingList = answer.binding ?? [];

  const calcSum = (key) => {
    if (!recipes?.[key]) return 0;
    return x.reduce((acc, count, i) => acc + (count ?? 0) * (recipes[key][i] ?? 0), 0);
  };

  const timeUsed = calcSum("time");
  const weightUsed = calcSum("weight");
  const stamUsed = calcSum("stamina");
  const survUsed = calcSum("survival");
  const slotsUsed = x.reduce((acc, count) => acc + (count ?? 0), 0);

  const timeMax = timeLimit ?? 50;
  const weightMax = limits?.weight ?? 40;
  const stamMax = limits?.stamina ?? 90;
  const survMin = limits?.survival_min ?? 30;
  const slotsMax = limits?.slots ?? 14;

  const meters = [
    {
      id: "time",
      label: "Crafting Time",
      unit: "min",
      used: timeUsed,
      limit: timeMax,
      isMinReq: false,
      isBinding: bindingList.includes("time"),
      slackSurplus: timeMax - timeUsed,
    },
    {
      id: "weight",
      label: "Carry Weight",
      unit: "kg",
      used: weightUsed,
      limit: weightMax,
      isMinReq: false,
      isBinding: bindingList.includes("weight"),
      slackSurplus: weightMax - weightUsed,
    },
    {
      id: "slots",
      label: "Inventory Capacity",
      unit: "slots",
      used: slotsUsed,
      limit: slotsMax,
      isMinReq: false,
      isBinding: bindingList.includes("slots"),
      slackSurplus: slotsMax - slotsUsed,
    },
    {
      id: "stamina",
      label: "Stamina Load",
      unit: "pts",
      used: stamUsed,
      limit: stamMax,
      isMinReq: false,
      isBinding: bindingList.includes("stamina"),
      slackSurplus: stamMax - stamUsed,
    },
    {
      id: "survival",
      label: "Survival Points",
      unit: "pts",
      used: survUsed,
      limit: survMin,
      isMinReq: true,
      isBinding: bindingList.includes("survival"),
      slackSurplus: survUsed - survMin,
    },
  ];

  return (
    <div className="loadout-meters-section">
      <div className="loadout-section-header">
        <h3>Resource & Constraint Consumption</h3>
        <span className="loadout-header-note">
          Binding constraints have 0 slack and determine shadow prices
        </span>
      </div>

      <div className="loadout-meters-grid" aria-label="Constraint Meters">
        {meters.map((m) => {
          const ratio = m.limit > 0 ? (m.used / m.limit) * 100 : 0;
          const clampedPercent = Math.min(100, Math.max(0, ratio));

          let fillClass = "meter-fill-normal";
          if (m.isBinding) {
            fillClass = "meter-fill-binding";
          } else if (m.isMinReq && m.used >= m.limit) {
            fillClass = "meter-fill-ok";
          }

          return (
            <div
              key={m.id}
              className={`loadout-meter-card ${m.isBinding ? "meter-card-binding" : ""}`}
              data-testid={`meter-${m.id}`}
            >
              <div className="meter-card-top">
                <span className="meter-card-label">{m.label}</span>
                {m.isBinding ? (
                  <span className="badge-binding" title="Constraint is 100% full with 0 slack">
                    Binding
                  </span>
                ) : (
                  <span className="badge-slack">
                    {m.isMinReq
                      ? `+${formatNum(m.slackSurplus)} ${m.unit} Surplus`
                      : `${formatNum(m.slackSurplus)} ${m.unit} Slack`}
                  </span>
                )}
              </div>

              <div className="meter-card-values">
                <span className="meter-used-val">
                  <strong>{formatNum(m.used)}</strong> / {formatNum(m.limit)} {m.unit}
                </span>
                <span className="meter-percentage">{Math.round(ratio)}%</span>
              </div>

              <div className="meter-track" role="progressbar" aria-valuenow={m.used} aria-valuemax={m.limit}>
                <div
                  className={`meter-bar-fill ${fillClass}`}
                  style={{ width: `${clampedPercent}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
