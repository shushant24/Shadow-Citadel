import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import App from "../App.jsx";

test("renders all four tabs and loads the scenario from fixtures", async () => {
  render(<App />);
  for (const name of ["Map", "Matchups", "Loadout", "Summary"]) {
    expect(screen.getByRole("tab", { name })).toBeInTheDocument();
  }
  expect(await screen.findByText(/Scenario Configuration \(8 nodes, 4 loot drops\)/)).toBeInTheDocument();
  expect(screen.getByText("Fixtures Mode")).toBeInTheDocument();
});

test("switching tabs shows that tab's fixture result", async () => {
  render(<App />);
  fireEvent.click(await screen.findByRole("tab", { name: "Matchups" }));
  expect(await screen.findByText(/"total": 445/)).toBeInTheDocument();
});

test("editing scenario updates state and shows modified badge, reset clears it", async () => {
  render(<App />);
  const timeInput = await screen.findByLabelText(/Raid Time Limit/i);

  // Initially not modified
  expect(screen.queryByText("Modified")).toBeNull();

  // Edit time limit inside act to await reactive re-fetching in tabs
  await act(async () => {
    fireEvent.change(timeInput, { target: { value: "105" } });
  });

  expect(await screen.findByText("Modified")).toBeInTheDocument();
  expect(timeInput).toHaveValue(105);

  // Click Reset to Defaults
  const resetBtn = screen.getByRole("button", { name: /Reset to Defaults/i });
  await act(async () => {
    fireEvent.click(resetBtn);
  });

  await waitFor(() => {
    expect(screen.queryByText("Modified")).toBeNull();
  });
  expect(timeInput).toHaveValue(120);
});
