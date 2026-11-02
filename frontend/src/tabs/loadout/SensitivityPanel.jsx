import React from "react";
import { formatNum } from "./formatBigM";

const SHADOW_META = [
  {
    id: "time",
    label: "Crafting Time (s1)",
    unit: "pts / min",
    icon: "⏱️",
    interp: "+1 min from faster tour yields +0.75 raid score",
  },
  {
    id: "weight",
    label: "Carry Weight (s2)",
    unit: "pts / kg",
    icon: "⚖️",
    interp: "+1 kg carry capacity yields +0.50 raid score",
  },
  {
    id: "slots",
    label: "Inventory Slots (a5)",
    unit: "pts / slot",
    icon: "🎒",
    interp: "+1 inventory slot yields +4.25 raid score",
  },
  {
    id: "stamina",
    label: "Stamina Limit (s3)",
    unit: "pts / pt",
    icon: "⚡",
    interp: "Non-binding: ample stamina buffer remains",
  },
  {
    id: "survival",
    label: "Min Survival (e4)",
    unit: "pts / pt",
    icon: "🛡️",
    interp: "Non-binding: survival threshold is already surpassed",
  },
];

export default function SensitivityPanel({ answer }) {
  if (!answer) return null;

  const shadowPrices = answer.shadow_prices ?? {};
  const bottleneck = answer.bottleneck;
  const bindingList = answer.binding ?? [];

  // Max shadow price for relative bar scale
  const maxPrice = Math.max(
    4.5,
    ...Object.values(shadowPrices).map((p) => (typeof p === "number" ? p : 0))
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
        <div className="loadout-bottleneck-banner" role="alert" aria-label="Bottleneck Alert">
          <span className="bottleneck-icon">💡</span>
          <div className="bottleneck-text">
            <strong>Bottleneck Identified:</strong> {bottleneck}
          </div>
        </div>
      )}

      <div className="loadout-shadow-grid" aria-label="Shadow Prices">
        {SHADOW_META.map((item) => {
          const price = shadowPrices[item.id] ?? 0;
          const isBinding = price > 0 || bindingList.includes(item.id);
          const barWidth = maxPrice > 0 ? (price / maxPrice) * 100 : 0;

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
                  +{formatNum(price)} {item.unit}
                </span>
              </div>

              <div className="shadow-bar-track" aria-hidden="true">
                <div
                  className={`shadow-bar-fill ${isBinding ? "fill-active" : "fill-zero"}`}
                  style={{ width: `${Math.max(barWidth, isBinding ? 8 : 0)}%` }}
                />
              </div>

              <div className="shadow-interp-note">{item.interp}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
