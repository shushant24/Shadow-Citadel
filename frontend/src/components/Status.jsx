import React from "react";

/**
 * Shared loading / error / infeasible rendering for envelope results.
 *   <Status loading={loading} error={error} result={data}>...</Status>
 * 
 * Rules:
 * - loading: displays loading indicator. Children are hidden.
 * - error: displays error message with role="alert". Children are hidden.
 * - infeasible / unbounded: displays status warning banner with role="status"
 *   AND still renders children so tabs can show the diagnostic trace.
 * - optimal: renders children without banner.
 */
export default function Status({ loading, error, result, children }) {
  if (loading) {
    return (
      <div className="status-loading" aria-busy="true">
        <span className="spinner" aria-hidden="true" />
        <p>Loading…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="status-error-container">
        <p className="error" role="alert">
          <strong>Error:</strong> {error.message}
        </p>
      </div>
    );
  }

  const notOptimal = result && result.status && result.status !== "optimal";

  return (
    <>
      {notOptimal && (
        <div className="status-banner">
          <p className="warn" role="status">
            <strong>{result.status === "infeasible" ? "Infeasible: " : "Unbounded: "}</strong>
            {result.answer?.message ?? "no message from the solver"}
          </p>
        </div>
      )}
      {children}
    </>
  );
}
