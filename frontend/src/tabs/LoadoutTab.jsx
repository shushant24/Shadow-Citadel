import React from "react";
import { api } from "../api.js";
import { useApi } from "../useApi.js";
import Status from "../components/Status.jsx";

export default function LoadoutTab({ scenario }) {
  const { loading, error, data } = useApi(() => api.craft({ time_limit: 50, recipes: scenario.recipes, limits: scenario.limits, method: "bigm" }), [scenario]);
  return (
    <section className="panel" aria-label="Loadout">
      <h2>Loadout</h2>
      <p className="todo">TODO Part 9: build this tab. Currently renders the raw fixture / API envelope.</p>
      <Status loading={loading} error={error}>
        <p>Status: <strong>{data?.status}</strong></p>
        <pre>{JSON.stringify(data?.answer, null, 2)}</pre>
      </Status>
    </section>
  );
}
