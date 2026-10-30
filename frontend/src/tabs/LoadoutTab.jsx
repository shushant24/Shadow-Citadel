import React from "react";
import { api } from "../api.js";
import { useApi } from "../useApi.js";
import Status from "../components/Status.jsx";

export default function LoadoutTab({ scenario }) {
  // Craft time derived from raid total_time minus the 70-minute optimal tour
  const craftTime = Math.max(0, (scenario?.total_time ?? 120) - 70);

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
