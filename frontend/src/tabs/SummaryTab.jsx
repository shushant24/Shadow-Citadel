import React from "react";
import { api } from "../api.js";
import { useApi } from "../useApi.js";
import Status from "../components/Status.jsx";

export default function SummaryTab({ scenario }) {
  const { loading, error, data } = useApi(() => api.experiments(), [scenario]);
  return (
    <section className="panel" aria-label="Summary">
      <h2>Summary</h2>
      <p className="todo">TODO Part 10: build this tab. Currently renders the raw fixture / API envelope.</p>
      <Status loading={loading} error={error} result={data}>
        <p>Status: <strong>{data?.status}</strong></p>
        <pre>{JSON.stringify(data?.answer, null, 2)}</pre>
      </Status>
    </section>
  );
}
