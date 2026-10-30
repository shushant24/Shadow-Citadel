import React from "react";
import { api } from "../api.js";
import { useApi } from "../useApi.js";
import Status from "../components/Status.jsx";

// Fixture-based optimal tour cost. Parts 7/10 will replace this with the live
// value from api.route (answer.cost) or api.pipeline (tour_time) once integrated.
const FIXTURE_OPTIMAL_TOUR_MIN = 70;

export default function LoadoutTab({ scenario }) {
  // Craft time = remaining raid time after the optimal tour
  const craftTime = Math.max(0, (scenario?.total_time ?? 120) - FIXTURE_OPTIMAL_TOUR_MIN);

  const { loading, error, data } = useApi(
    () =>
      api.craft({
        time_limit: craftTime,
        recipes: scenario?.recipes,
        limits: scenario?.limits,
        method: "bigm",
      }),
    [craftTime, scenario?.recipes, scenario?.limits]
  );

  return (
    <section className="panel" aria-label="Loadout">
      <h2>Loadout</h2>
      <p className="todo">TODO Part 9: build this tab. Currently renders the raw fixture / API envelope.</p>
      <Status loading={loading} error={error} result={data}>
        <p>Status: <strong>{data?.status}</strong></p>
        <pre>{JSON.stringify(data?.answer, null, 2)}</pre>
      </Status>
    </section>
  );
}
