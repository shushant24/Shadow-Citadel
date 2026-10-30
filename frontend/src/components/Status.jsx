import React from "react";

/**
 * Shared loading / error / infeasible rendering for envelope results.
 *   <Status loading={loading} error={error} result={data}>...</Status>
 * `result` is optional: when its status is "infeasible" or "unbounded" a readable message (answer.message)
 * is shown above the children, which still render so tabs can show the trace that led there.
 */
export default function Status({ loading, error, result, children }) {
  if (loading) return <p>Loading…</p>;
  if (error) return <p className="error" role="alert">Error: {error.message}</p>;
  const notOptimal = result && result.status && result.status !== "optimal";
  return (
    <>
      {notOptimal && (
        <p className="warn" role="status">
          {result.status === "infeasible" ? "Infeasible: " : "Unbounded: "}
          {result.answer?.message ?? "no message from the solver"}
        </p>
      )}
      {children}
    </>
  );
}
