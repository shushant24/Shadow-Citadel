import React from "react";
import { formatNum } from "./formatBigM";

const RESOURCE_META = [
  {
    id: "time",
    label: "Crafting Time (s1)",
    unit: "pts / min",
    icon: "⏱️",
    unitSingular: "minute",
  },
  {
    id: "weight",
    label: "Carry Weight (s2)",
    unit: "pts / kg",
    icon: "⚖️",
    unitSingular: "kg",
  },
  {
    id: "slots",
    label: "Inventory Slots",
    unit: "pts / slot",
    icon: "🎒",
    unitSingular: "slot",
  },
  {
    id: "stamina",
    label: "Stamina Limit (s3)",
    unit: "pts / pt",
    icon: "⚡",
    unitSingular: "stamina pt",
  },
  {
    id: "survival",
    label: "Min Survival (e4)",
    unit: "pts / pt",
    icon: "🛡️",
    unitSingular: "survival pt",
  },
];

function getInterpretation(item, price, isBinding) {
  if (isBinding && price > 0) {
    return `+${formatNum(price)} raid score per additional ${item.unitSingular}`;
  }
  if (isBinding && price < 0) {
    return `${formatNum(price)} raid score per additional ${item.unitSingular}`;
  }
  if (isBinding && price === 0) {
    return "Binding constraint: limit reached with zero marginal value";
  }
  return "Non-binding: surplus/slack remains, so relaxing limit does not change score";
}

export default function SensitivityPanel({ answer }) {
  if (!answer) return null;

  const shadowPrices = answer.shadow_prices ?? {};
  const bottleneck = answer.bottleneck;
  const bindingList = answer.binding ?? [];

  const maxPrice = Math.max(
    1,
    ...Object.values(shadowPrices).map((p) =>
      typeof p === "number" && !isNaN(p) ? Math.max(0, p) : 0
    )
  );

  return (
    <div className="loadout-sensitivity-section">
      <div className="loadout-section-header">
        <h3>Sensitivity Analysis & Dual Shadow Prices</h3>
        <span className="loadout-header-note">
          Marginal value of resources derived from final tableau Row 0 (dual variables)
        </span>
      </div>

      {bottleneck && (
        <div className="alert alert-info loadout-bottleneck-banner" role="alert" aria-label="Bottleneck Alert">
          <span className="alert-icon">ℹ️</span>
          <div className="alert-content">
            <strong className="alert-title">Bottleneck:</strong>
            <span> {bottleneck}</span>
          </div>
        </div>
      )}

      <div className="loadout-shadow-grid" aria-label="Shadow Prices">
        {RESOURCE_META.map((item) => {
          const price = shadowPrices[item.id] ?? 0;
          const isBinding = price !== 0 || bindingList.includes(item.id);
          const positivePrice = Math.max(0, price);
          const barWidth = maxPrice > 0 ? (positivePrice / maxPrice) * 100 : 0;
          const interpText = getInterpretation(item, price, isBinding);

          return (
            <div
              key={item.id}
              className={`loadout-shadow-card ${isBinding ? "shadow-binding" : "shadow-slack"}`}
              data-testid={`shadow-price-${item.id}`}
            >
              <div className="shadow-card-top">
                <span className="shadow-item-name">
                  <span className="shadow-icon">{item.icon}</span> {item.label}
                </span>
                <span className={`shadow-price-badge ${isBinding ? "price-active" : "price-zero"}`}>
                  {price > 0 ? `+${formatNum(price)}` : formatNum(price)} {item.unit}
                </span>
              </div>

              <div className="shadow-bar-track" aria-hidden="true">
                <div
                  className={`shadow-bar-fill ${isBinding ? "fill-active" : "fill-zero"}`}
                  style={{ width: `${Math.max(0, Math.min(100, isBinding ? Math.max(barWidth, 8) : 0))}%` }}
                />
              </div>

              <div className="shadow-interp-note">{interpText}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
