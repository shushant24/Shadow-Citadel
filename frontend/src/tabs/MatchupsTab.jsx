import React from "react";
import { api } from "../api.js";
import { useApi } from "../useApi.js";
import Status from "../components/Status.jsx";

export default function MatchupsTab({ scenario }) {
  const { loading, error, data } = useApi(() => api.assign(scenario.weapon_boss_scores, true), [scenario]);
  return (
    <section className="panel" aria-label="Matchups">
      <h2>Matchups</h2>
      <p className="todo">TODO Part 8: build this tab. Currently renders the raw fixture / API envelope.</p>
      <Status loading={loading} error={error}>
        <p>Status: <strong>{data?.status}</strong></p>
        <pre>{JSON.stringify(data?.answer, null, 2)}</pre>
      </Status>
    </section>
  );
}
