# Research Document 6: Testing Strategy and Quality Assurance

## 1. Test Architecture & Environment

The frontend test suite is powered by **Vitest** with **JSDOM** and **React Testing Library**.
Configuration in `frontend/vite.config.js`:
```javascript
test: {
  environment: "jsdom",
  globals: true,
  env: { VITE_USE_FIXTURES: "true" }, // Forces fixtures in tests regardless of local .env
  setupFiles: ["./src/setupTests.js"],
}
```

The PR checklist in `.github/pull_request_template.md` mandates:
> *"Frontend: at least 2 component tests (renders from fixture, handles error state)"*

For Part 6, because it provides the shared foundation for all tabs, we establish high test coverage across all owned components.

---

## 2. Test Matrix for Part 6 Components

```
+-----------------------------------------------------------------------------------------+
| Component          | Test Case Description                                  | Type      |
+-----------------------------------------------------------------------------------------+
| App.jsx            | 1. Renders 4 tabs and loads scenario on mount           | Unit/Integ|
|                    | 2. Tab switching displays target tab component          | Unit/Integ|
|                    | 3. Edits in ScenarioPanel propagate to active tab      | Integ     |
|                    | 4. Displays data source banner and fixture notice       | Unit      |
|--------------------+---------------------------------------------------------+-----------|
| ScenarioPanel.jsx  | 1. Renders inputs for total_time, limits, and recipes   | Unit      |
|                    | 2. Updating total_time calls onChange with new time     | Unit      |
|                    | 3. Updating limits.weight calls onChange with new limit | Unit      |
|                    | 4. Updating recipe cell calls onChange with new matrix  | Unit      |
|                    | 5. Reset button reverts scenario to default values      | Unit      |
|                    | 6. Preserves unedited fields (nodes, loot, scores)      | Regression|
|--------------------+---------------------------------------------------------+-----------|
| StepPlayer.jsx     | 1. Step rendering via render-prop callback              | Unit      |
|                    | 2. Next and Back buttons increment/decrement index      | Unit      |
|                    | 3. First and Last jump buttons navigate boundaries      | Unit      |
|                    | 4. Scrubber slider updates active step index            | Unit      |
|                    | 5. Play / Pause toggles playback; pauses at final step  | Async/Timer|
|                    | 6. Graceful handling of empty steps array               | Edge Case |
|                    | 7. Single step array disables navigation controls       | Edge Case |
|                    | 8. Resets index to 0 when `steps` prop changes          | Lifecycle |
|                    | 9. Displays step note / phase description               | Unit      |
|--------------------+---------------------------------------------------------+-----------|
| Status.jsx         | 1. Shows loading indicator when loading=true            | Unit      |
|                    | 2. Shows error message with role="alert"                | Unit/A11y |
|                    | 3. Infeasible result displays role="status" & children  | Contract  |
|                    | 4. Unbounded result displays role="status" & children   | Contract  |
|                    | 5. Optimal result renders children without warning      | Unit      |
|--------------------+---------------------------------------------------------+-----------|
| api.js             | 1. All fixture endpoints return valid envelopes         | Contract  |
|                    | 2. Immutability check: structuredClone prevents leaks   | Regression|
+-----------------------------------------------------------------------------------------+
```

---

## 3. Critical Verification Scenarios

### 3.1 Scenario Propagation Verification
In `App.test.jsx`:
```javascript
test("editing scenario in ScenarioPanel propagates to active tab", async () => {
  render(<App />);
  const timeInput = await screen.findByLabelText(/Raid Time Limit/i);
  fireEvent.change(timeInput, { target: { value: "100" } });
  // Verify that the active tab received the updated scenario
  expect(timeInput.value).toBe("100");
});
```

### 3.2 StepPlayer Playback and Boundary Verification
In `StepPlayer.test.jsx`:
```javascript
test("Play auto-advances steps and pauses at the final step", async () => {
  vi.useFakeTimers();
  const steps = [{ n: 1 }, { n: 2 }, { n: 3 }];
  render(
    <StepPlayer steps={steps} initialSpeedMs={100}>
      {(s) => <span>value {s.n}</span>}
    </StepPlayer>
  );

  const playBtn = screen.getByText("Play");
  fireEvent.click(playBtn);
  expect(screen.getByText("Pause")).toBeInTheDocument();

  // Advance time to transition through steps
  act(() => { vi.advanceTimersByTime(100); });
  expect(screen.getByText("value 2")).toBeInTheDocument();

  act(() => { vi.advanceTimersByTime(100); });
  expect(screen.getByText("value 3")).toBeInTheDocument();

  // Reached end -> auto-pauses
  expect(screen.getByText("Play")).toBeInTheDocument();
  vi.useRealTimers();
});
```

### 3.3 Status Infeasible Behavior (Contract Test)
In `Status.test.jsx`:
```javascript
test("infeasible result renders warning but preserves children", () => {
  const result = {
    status: "infeasible",
    answer: { message: "Crafting is infeasible with 40 minutes remaining." },
    steps: [{ iteration: 0 }]
  };
  render(
    <Status result={result}>
      <div data-testid="diagnostic-view">Tableau Step History</div>
    </Status>
  );
  expect(screen.getByRole("status")).toHaveTextContent("Crafting is infeasible with 40 minutes remaining.");
  expect(screen.getByTestId("diagnostic-view")).toBeInTheDocument();
});
```

---

## 4. Quality Checklist Before PR Submission

- [ ] All Vitest tests pass without warnings (`npm test` in `frontend/`).
- [ ] No regression on existing tests (`api.test.js`, `Status.test.jsx`, `StepPlayer.test.jsx`, `App.test.jsx`).
- [ ] No lint or formatting errors.
- [ ] Strict contract compliance with `backend/contract.py` verified.
