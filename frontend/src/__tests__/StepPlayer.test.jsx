import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import StepPlayer from "../components/StepPlayer.jsx";

const steps = [{ n: 1 }, { n: 2 }, { n: 3 }];

test("Next and Back move through the steps", () => {
  render(<StepPlayer steps={steps}>{(s) => <p>step value {s.n}</p>}</StepPlayer>);
  expect(screen.getByText("step value 1")).toBeInTheDocument();
  fireEvent.click(screen.getByText("Next"));
  expect(screen.getByText("step value 2")).toBeInTheDocument();
  fireEvent.click(screen.getByText("Back"));
  expect(screen.getByText("step value 1")).toBeInTheDocument();
});

test("shows a message when there are no steps", () => {
  render(<StepPlayer steps={[]} />);
  expect(screen.getByText(/No steps/)).toBeInTheDocument();
});
