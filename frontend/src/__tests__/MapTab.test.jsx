import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import MapTab from "../tabs/MapTab.jsx";
import scenarioFixture from "@fixtures/scenario.json";

describe("MapTab Component (Part 7)", () => {
  it("renders correctly from fixtures with 70-minute optimal tour and safe hull metrics", async () => {
    render(<MapTab scenario={scenarioFixture} />);

    // Check optimal tour 70 min
    expect(await screen.findByText("70")).toBeInTheDocument();
    expect(screen.getByText(/Optimal Tour \(B&B\)/i)).toBeInTheDocument();

    // Check nearest neighbour 80 min
    expect(screen.getByText("80")).toBeInTheDocument();
    expect(screen.getAllByText(/Nearest Neighbour/i)[0]).toBeInTheDocument();

    // Check 7 vertices for safe zone convex hull
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText(/Convex Hull Boundary/i)).toBeInTheDocument();

    // Check SVG map is present
    expect(screen.getByRole("img", { name: /Shadow Citadel Raid Map/i })).toBeInTheDocument();
  });

  it("toggles between Optimal Tour (70m) and Nearest Neighbour (80m)", async () => {
    render(<MapTab scenario={scenarioFixture} />);

    const nnButton = await screen.findByRole("button", { name: /Nearest Neighbour \(80m\)/i });
    fireEvent.click(nnButton);

    await waitFor(() => {
      expect(screen.getByText(/Nearest Neighbour Itinerary \(80 min\)/i)).toBeInTheDocument();
    });
  });

  it("toggles subtour overlay and shows the Hungarian relaxation cost 64 min notice", async () => {
    render(<MapTab scenario={scenarioFixture} />);

    const subtourBtn = await screen.findByRole("button", { name: /Subtours \(64m\)/i });
    fireEvent.click(subtourBtn);

    await waitFor(() => {
      expect(screen.getByText(/Hungarian Relaxation Subtours \(Pass 1 Cost: 64 minutes\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Subtour 1 \(18m\):/i)).toBeInTheDocument();
      expect(screen.getByText(/Subtour 2 \(46m\):/i)).toBeInTheDocument();
    });
  });

  it("renders node and loot coordinates correctly on map", async () => {
    render(<MapTab scenario={scenarioFixture} />);

    expect(await screen.findByText(/Base \(0,0\)/i)).toBeInTheDocument();
    expect(screen.getByText(/C1 \(15,18\)/i)).toBeInTheDocument();
    expect(screen.getByText(/L1 \(23,12\)/i)).toBeInTheDocument();
    expect(screen.getByText(/L4 \(16,4\)/i)).toBeInTheDocument();
  });

  it("resets coordinates to default scenario on button click", async () => {
    render(<MapTab scenario={scenarioFixture} />);

    const resetBtn = await screen.findByRole("button", { name: /Reset Coordinates/i });
    fireEvent.click(resetBtn);

    expect(screen.getByText(/Base \(0,0\)/i)).toBeInTheDocument();
  });
});
