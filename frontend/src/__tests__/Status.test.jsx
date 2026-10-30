import React from "react";
import { render, screen } from "@testing-library/react";
import Status from "../components/Status.jsx";

test("shows the error message in an alert", () => {
  render(<Status error={new Error("boom")}>child</Status>);
  expect(screen.getByRole("alert")).toHaveTextContent("boom");
  expect(screen.queryByText("child")).toBeNull();
});

test("an infeasible result shows its message and still renders the children", () => {
  const result = { status: "infeasible", answer: { message: "No feasible crafting plan." }, steps: [] };
  render(<Status result={result}>child</Status>);
  expect(screen.getByRole("status")).toHaveTextContent("Infeasible: No feasible crafting plan.");
  expect(screen.getByText("child")).toBeInTheDocument();
});

test("an optimal result shows no warning", () => {
  render(<Status result={{ status: "optimal", answer: {}, steps: [] }}>child</Status>);
  expect(screen.queryByRole("status")).toBeNull();
});
