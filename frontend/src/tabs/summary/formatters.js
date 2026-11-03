/**
 * Shared numeric and gain formatters for SummaryTab components.
 * Consistently rounds percentages to 1 decimal place (12.5, 7.5, 5.4).
 */

export function formatGainPct(pct, withPlus = true) {
  if (pct === null || pct === undefined || isNaN(pct)) return "n/a";
  const num = Number(pct);
  const formatted = num.toFixed(1);
  if (withPlus && num > 0) {
    return `+${formatted}%`;
  }
  return `${formatted}%`;
}

export function formatMs(ms) {
  if (ms === null || ms === undefined || isNaN(ms)) return "n/a";
  return `${Number(ms).toFixed(1)} ms`;
}
