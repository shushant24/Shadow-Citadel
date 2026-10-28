import React from "react";

// Shared loading / error / infeasible rendering for envelope results.
export default function Status({ loading, error, children }) {
  if (loading) return <p>Loading…</p>;
  if (error) return <p className="error" role="alert">Error: {error.message}</p>;
  return children;
}
