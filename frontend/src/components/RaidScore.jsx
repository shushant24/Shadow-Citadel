import React from "react";

/** Minutes of crafting the plan needs at least: every slot filled with the fastest recipe. */
export function minCraftTimeNeeded(scenario) {
  const slots = Number(scenario?.limits?.slots);
  const times = (scenario?.recipes?.time ?? []).map(Number).filter(Number.isFinite);
  if (!Number.isFinite(slots) || times.length === 0) return null;
  return slots * Math.min(...times);
}

/**
 * One /api/pipeline result as a score card: total = combat + crafting, with the tour time
 * and the crafting time it leaves. Infeasible crafting shows the combat-only score.
 */
export default function RaidScore({ label, result, loading, error, minNeeded, testId }) {
  const a = result?.answer;
  let body;
  if (loading) {
    body = <div className="raid-score-sub text-muted">Computing pipeline…</div>;
  } else if (error) {
    body = <div className="raid-score-sub text-danger">Pipeline unavailable: {error.message ?? String(error)}</div>;
  } else if (!a) {
    body = <div className="raid-score-sub text-muted">No pipeline result.</div>;
  } else {
    const feasible = result.status === "optimal" && a.total != null;
    const lacksTime = minNeeded != null && a.craft_time < minNeeded;
    body = (
      <>
        <div className={`raid-score-total ${feasible ? "text-accent" : "text-danger"}`}>
          {feasible ? `${a.total} pts` : `${a.combat} pts (combat only)`}
        </div>
        <div className="raid-score-sub">
          {feasible
            ? `${a.combat} combat + ${a.crafting} crafting`
            : lacksTime
              ? `Crafting infeasible: ${a.craft_time} min left, ${minNeeded} needed`
              : a.message || "Crafting infeasible"}
        </div>
        <dl className="raid-score-facts">
          <div><dt>Tour</dt><dd>{`${a.tour_time} min`}</dd></div>
          <div><dt>Crafting time</dt><dd>{`${a.craft_time} min`}</dd></div>
          <div><dt>Combat</dt><dd>{`${a.combat} pts`}</dd></div>
          <div><dt>Crafting</dt><dd>{a.crafting != null ? `${a.crafting} pts` : "infeasible"}</dd></div>
        </dl>
      </>
    );
  }
  return (
    <div className="raid-score-card" data-testid={testId}>
      <div className="raid-score-label">{label}</div>
      {body}
    </div>
  );
}
