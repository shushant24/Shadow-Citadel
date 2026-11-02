/**
 * formatBigM.js — Utilities for formatting Big-M symbolic expressions and numbers.
 */

/**
 * Format a number cleanly: integer if near integer, otherwise rounded to 2 decimal places.
 */
export function formatNum(n) {
  if (n === null || n === undefined) return "-";
  const num = typeof n === "number" ? n : Number(n);
  if (isNaN(num)) return "-";
  if (Math.abs(num - Math.round(num)) < 1e-4) {
    return String(Math.round(num));
  }
  return String(Number(num.toFixed(2)));
}

/**
 * Format a symbolic Big-M objective value or reduced cost: a*M + b.
 * Examples:
 *   m=-6, c=-8  -> "-6M - 8"
 *   m=1,  c=0   -> "M"
 *   m=-1, c=3   -> "-M + 3"
 *   m=0,  c=117 -> "117"
 *   m=0,  c=-8  -> "-8"
 */
export function formatSymbolic(mVal, cVal) {
  const m = Number(mVal ?? 0);
  const c = Number(cVal ?? 0);

  const roundVal = (v) => {
    if (Math.abs(v - Math.round(v)) < 1e-4) return Math.round(v);
    return Number(v.toFixed(2));
  };

  const mR = roundVal(m);
  const cR = roundVal(c);

  if (mR === 0) {
    return formatNum(cR);
  }

  let mStr = "";
  if (mR === 1) mStr = "M";
  else if (mR === -1) mStr = "-M";
  else mStr = `${mR}M`;

  if (cR === 0) {
    return mStr;
  }

  if (cR > 0) {
    return `${mStr} + ${formatNum(cR)}`;
  } else {
    return `${mStr} - ${formatNum(Math.abs(cR))}`;
  }
}
