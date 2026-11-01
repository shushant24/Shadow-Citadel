import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import MapTab from "../tabs/MapTab.jsx";
import scenarioFixture from "@fixtures/scenario.json";

function simulateDrag(element, targetCanvas, startX, startY, endX, endY) {
  fireEvent.pointerDown(element, { pointerId: 1, clientX: startX, clientY: startY });
  fireEvent(targetCanvas, Object.assign(new Event("pointermove", { bubbles: true }), { clientX: endX, clientY: endY }));
  fireEvent(targetCanvas, Object.assign(new Event("pointerup", { bubbles: true }), { clientX: endX, clientY: endY }));
}

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

  it("toggles between Optimal Tour and Nearest Neighbour", async () => {
    render(<MapTab scenario={scenarioFixture} />);

    const nnButton = await screen.findByRole("button", { name: /Nearest Neighbour \(80m\)/i });
    fireEvent.click(nnButton);

    await waitFor(() => {
      expect(screen.getByText(/Nearest Neighbour Itinerary \(80 min\)/i)).toBeInTheDocument();
    });
  });

  it("toggles subtour overlay and shows the Hungarian relaxation cost notice with closed loops", async () => {
    render(<MapTab scenario={scenarioFixture} />);

    const subtourBtn = await screen.findByRole("button", { name: /Subtours \(64m\)/i });
    fireEvent.click(subtourBtn);

    await waitFor(() => {
      expect(screen.getByText(/Hungarian Relaxation Subtours \(Pass 1 Cost: 64 minutes\)/i)).toBeInTheDocument();
      // Verifies closed loops are listed (e.g. ending at the start node)
      expect(screen.getByText(/Subtour 1 \(18m\):/i)).toBeInTheDocument();
      expect(screen.getByText(/Base → C7 → C5 → Base/i)).toBeInTheDocument();
      expect(screen.getByText(/Subtour 2 \(46m\):/i)).toBeInTheDocument();
      expect(screen.getByText(/C1 → C6 → C3 → C4 → C2 → C1/i)).toBeInTheDocument();
    });
  });

  it("renders node and loot coordinates correctly on map", async () => {
    render(<MapTab scenario={scenarioFixture} />);

    expect(await screen.findByText("Base (0,0)")).toBeInTheDocument();
    expect(screen.getByText("C1 (15,18)")).toBeInTheDocument();
    expect(screen.getByText("L1 (23,12)")).toBeInTheDocument();
    expect(screen.getByText("L4 (16,4)")).toBeInTheDocument();
  });

  it("recomputes optimal route and hull when dragging a node (drag-to-recompute)", async () => {
    render(<MapTab scenario={scenarioFixture} />);

    expect(await screen.findByText("C2 (19,5)")).toBeInTheDocument();
    expect(screen.getByText("70")).toBeInTheDocument();

    const svgCanvas = screen.getByRole("img", { name: /Shadow Citadel Raid Map/i });
    const c2Text = screen.getByText("C2 (19,5)");

    // Drag C2 away from (19,5)
    simulateDrag(c2Text, svgCanvas, 500, 500, 780, 150);

    // C2 coordinates should update to new position and old coordinates disappear
    await waitFor(() => {
      expect(screen.queryByText("C2 (19,5)")).not.toBeInTheDocument();
      expect(screen.getByText("C2 (26,21)")).toBeInTheDocument();
    });

    // Tour cost must have recomputed and no longer equal the static 70m
    const metricWinners = screen.getAllByText(/Stage 2 Winner/i);
    expect(metricWinners.length).toBeGreaterThan(0);
    const metricBox = metricWinners[0].closest(".metric-box");
    expect(metricBox).not.toHaveTextContent("70 min");
  });

  it("recomputes only hull when dragging a loot drop without changing route cost", async () => {
    render(<MapTab scenario={scenarioFixture} />);

    expect(await screen.findByText("L1 (23,12)")).toBeInTheDocument();
    expect(screen.getByText("70")).toBeInTheDocument();

    const svgCanvas = screen.getByRole("img", { name: /Shadow Citadel Raid Map/i });
    const l1Text = screen.getByText("L1 (23,12)");

    // Drag loot L1 away
    simulateDrag(l1Text, svgCanvas, 600, 400, 780, 150);

    // L1 coordinates should change
    await waitFor(() => {
      expect(screen.queryByText("L1 (23,12)")).not.toBeInTheDocument();
      expect(screen.getByText("L1 (26,21)")).toBeInTheDocument();
    });

    // Route cost remains 70 since loot drops are not tour checkpoints
    expect(screen.getByText("70")).toBeInTheDocument();
  });

  it("resets coordinates to default scenario and restores demo metrics on button click", async () => {
    render(<MapTab scenario={scenarioFixture} />);

    expect(await screen.findByText("C2 (19,5)")).toBeInTheDocument();
    const svgCanvas = screen.getByRole("img", { name: /Shadow Citadel Raid Map/i });
    const c2Text = screen.getByText("C2 (19,5)");

    // First drag C2 away
    simulateDrag(c2Text, svgCanvas, 500, 500, 780, 150);

    // Verify it moved
    await waitFor(() => {
      expect(screen.queryByText("C2 (19,5)")).not.toBeInTheDocument();
    });

    // Now click Reset Coordinates
    const resetBtn = screen.getByRole("button", { name: /Reset Coordinates/i });
    fireEvent.click(resetBtn);

    // Must restore C2 (19,5) and 70 min optimal tour
    await waitFor(() => {
      expect(screen.getByText("C2 (19,5)")).toBeInTheDocument();
      expect(screen.getByText("70")).toBeInTheDocument();
    });
  });
});
