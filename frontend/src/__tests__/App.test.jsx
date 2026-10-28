import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import App from "../App.jsx";

test("renders all four tabs and loads the scenario from fixtures", async () => {
  render(<App />);
  for (const name of ["Map", "Matchups", "Loadout", "Summary"]) {
    expect(screen.getByRole("tab", { name })).toBeInTheDocument();
  }
  expect(await screen.findByText(/Scenario \(8 nodes, 4 loot drops\)/)).toBeInTheDocument();
});

test("switching tabs shows that tab's fixture result", async () => {
  render(<App />);
  fireEvent.click(await screen.findByRole("tab", { name: "Matchups" }));
  expect(await screen.findByText(/"total": 445/)).toBeInTheDocument();
});
