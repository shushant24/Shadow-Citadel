/**
 * Utility formatting for the Part 9 loadout tableau.
 * Handles plain numeric values and symbolic Big-M objective entries.
 */

export function formatNum(n) {
  if (n === null || n === undefined) return "-";

  const num = typeof n === "number" ? n : Number(n);
  if (Number.isNaN(num)) return "-";

  if (Math.abs(num - Math.round(num)) < 1e-4) {
    return String(Math.round(num));
  }

  return String(Number(num.toFixed(2)));
}

export function formatSymbolic(mVal, cVal) {
  const m = Number(mVal ?? 0);
  const c = Number(cVal ?? 0);

  const roundVal = (v) => {
    if (Math.abs(v - Math.round(v)) < 1e-4) return Math.round(v);
    return Number(v.toFixed(2));
  };

  const mR = roundVal(m);
  const cR = roundVal(c);

  if (mR === 0) return formatNum(cR);

  let mStr = "";
  if (mR === 1) mStr = "M";
  else if (mR === -1) mStr = "-M";
  else mStr = `${mR}M`;

  if (cR === 0) return mStr;
  if (cR > 0) return `${mStr} + ${formatNum(cR)}`;
  return `${mStr} - ${formatNum(Math.abs(cR))}`;
}
