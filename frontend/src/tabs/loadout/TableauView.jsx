import React from "react";
import { formatNum, formatSymbolic } from "./formatBigM";

export default function TableauView({ step, isBigM = true }) {
  if (!step) return null;

  const columns = step.columns ?? [];
  const basis = step.basis ?? [];
  const tableau = step.tableau ?? [];
  const zrow = step.zrow ?? {};
  const pivot = step.pivot; // [row, col] or null
  const entering = step.entering;
  const leaving = step.leaving;
  const isOptimalOrFinal = pivot === null;

  return (
    <div className="loadout-tableau-card">
      <div className="tableau-top-meta">
        <div className="tableau-step-tags">
          <span className="badge-iteration">Iteration {step.iteration}</span>
          <span className="badge-phase">{step.phase ?? (isBigM ? "bigm" : "twophase")}</span>
          <span className="badge-objective">
            Z = {isBigM && step.z_m ? formatSymbolic(step.z_m, step.z) : formatNum(step.z)}
          </span>
        </div>

        <div className="tableau-basis-display">
          <span className="basis-label">Current Basis:</span>
          <span className="basis-vars">[{basis.join(", ")}]</span>
        </div>
      </div>

      {/* Pivot & Note Banner */}
      <div className="tableau-pivot-banner" aria-label="Pivot Decision Details">
        <div className="pivot-metric">
          <span className="pivot-metric-label">Entering:</span>
          {entering ? (
            <span className="badge-entering">↓ {entering}</span>
          ) : (
            <span className="badge-none">None (Optimal)</span>
          )}
        </div>

        <div className="pivot-metric">
          <span className="pivot-metric-label">Leaving:</span>
          {leaving ? (
            <span className="badge-leaving">← {leaving}</span>
          ) : (
            <span className="badge-none">None (Optimal)</span>
          )}
        </div>

        <div className="pivot-metric">
          <span className="pivot-metric-label">Pivot Element:</span>
          {pivot ? (
            <span className="badge-pivot-coord">
              [Row {pivot[0]}, Col {pivot[1]}]
            </span>
          ) : (
            <span className="badge-none">Final Basis</span>
          )}
        </div>
      </div>

      {/* Responsive Simplex Tableau Table */}
      <div className="table-responsive loadout-table-wrapper">
        <table className="loadout-tableau-table" aria-label="Simplex Tableau Grid">
          <thead>
            <tr>
              <th className="th-basis">Basis</th>
              {columns.map((col, cIdx) => {
                const isEnteringCol = col === entering || (pivot && pivot[1] === cIdx);
                return (
                  <th
                    key={col}
                    className={`th-col ${isEnteringCol ? "th-col-entering" : ""}`}
                  >
                    {isEnteringCol ? `↓ ${col}` : col}
                  </th>
                );
              })}
              <th className="th-rhs">RHS</th>
            </tr>
          </thead>
          <tbody>
            {tableau.map((row, rIdx) => {
              const basicVar = basis[rIdx] ?? `Row ${rIdx}`;
              const isLeavingRow = basicVar === leaving || (pivot && pivot[0] === rIdx);

              return (
                <tr
                  key={rIdx}
                  className={`tableau-row ${isLeavingRow ? "row-leaving" : ""}`}
                >
                  <td className={`td-basis ${isLeavingRow ? "td-basis-leaving" : ""}`}>
                    {isLeavingRow ? `← ${basicVar}` : basicVar}
                  </td>
                  {columns.map((col, cIdx) => {
                    const isPivotCell = pivot && pivot[0] === rIdx && pivot[1] === cIdx;
                    const isEnteringCol = pivot && pivot[1] === cIdx;
                    const cellVal = row[cIdx];

                    let cellClass = "td-cell";
                    if (isPivotCell) {
                      cellClass += " td-pivot-cell";
                    } else if (isEnteringCol) {
                      cellClass += " td-entering-col";
                    } else if (isLeavingRow) {
                      cellClass += " td-leaving-row";
                    }

                    return (
                      <td
                        key={col}
                        className={cellClass}
                        title={
                          isPivotCell
                            ? `Pivot element: Row ${rIdx} (${basicVar}), Col ${cIdx} (${col})`
                            : undefined
                        }
                      >
                        {formatNum(cellVal)}
                      </td>
                    );
                  })}
                  <td className="td-rhs">
                    {formatNum(row[row.length - 1])}
                  </td>
                </tr>
              );
            })}

            {/* Objective Function Row (Z-row) */}
            <tr className="tableau-zrow">
              <td className="td-basis-z">Z - C</td>
              {columns.map((col, cIdx) => {
                const isEnteringCol = col === entering || (pivot && pivot[1] === cIdx);
                const cVal = zrow?.c?.[cIdx];
                const mVal = zrow?.m?.[cIdx];
                const displayVal =
                  isBigM && mVal !== undefined && mVal !== 0
                    ? formatSymbolic(mVal, cVal)
                    : formatNum(cVal);

                return (
                  <td
                    key={col}
                    className={`td-cell-z ${isEnteringCol ? "td-entering-col" : ""}`}
                  >
                    {displayVal}
                  </td>
                );
              })}
              <td className="td-rhs-z">
                {isBigM && step.z_m
                  ? formatSymbolic(step.z_m, step.z)
                  : formatNum(step.z)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
