import React, { useCallback, useState } from "react";
import { api, USE_FIXTURES, FIXTURE_LIMITS, API_BASE_URL } from "./api.js";
import { useApi } from "./useApi.js";
import Status from "./components/Status.jsx";
import ScenarioPanel from "./components/ScenarioPanel.jsx";
import MapTab from "./tabs/MapTab.jsx";
import MatchupsTab from "./tabs/MatchupsTab.jsx";
import LoadoutTab from "./tabs/LoadoutTab.jsx";
import SummaryTab from "./tabs/SummaryTab.jsx";

const TABS = [
  { id: "map", label: "Map", Component: MapTab },
  { id: "matchups", label: "Matchups", Component: MatchupsTab },
  { id: "loadout", label: "Loadout", Component: LoadoutTab },
  { id: "summary", label: "Summary", Component: SummaryTab },
];

export default function App() {
  const [active, setActive] = useState("map");
  const { loading, error, data: loaded } = useApi(() => api.scenario(), []);

  // A benchmark map loaded from the Summary tab replaces the demo as the base scenario.
  // `loaded` = demo, `benchmarkMap` = { scenario, meta } or null, `edited` = ScenarioPanel overrides.
  const [benchmarkMap, setBenchmarkMap] = useState(null);
  const [edited, setEdited] = useState(null);
  const scenario = edited ?? benchmarkMap?.scenario ?? loaded;
  const isEdited = edited !== null;
  const benchmark = benchmarkMap ? { ...benchmarkMap.meta, edited: isEdited } : null;

  const ActiveComponent = TABS.find((t) => t.id === active)?.Component ?? MapTab;

  const handleResetScenario = () => {
    setEdited(null);
  };

  /** Make `newScenario` the active scenario for every tab and open the Map tab. */
  const loadScenario = useCallback((newScenario) => {
    const { benchmark: meta = null, ...rest } = newScenario ?? {};
    setEdited(null);
    setBenchmarkMap(meta ? { scenario: rest, meta } : null);
    setActive("map");
  }, []);

  const handleBackToDemo = () => {
    handleResetScenario();
    setBenchmarkMap(null);
  };

  const liveSource = API_BASE_URL ? `live API (${API_BASE_URL})` : "live API";

  return (
    <main className="app">
      <header className="app-header">
        <div className="title-row">
          <h1>Shadow Citadel Raid Optimizer</h1>
          <span className={`source-badge ${USE_FIXTURES ? "badge-fixtures" : "badge-live"}`}>
            {USE_FIXTURES ? "Fixtures Mode" : "Live Backend"}
          </span>
        </div>
        <p className="data-source-info" title={USE_FIXTURES ? FIXTURE_LIMITS : undefined}>
          Data source:{" "}
          {USE_FIXTURES
            ? "fixtures (offline, canned results: sliders, drag and edits do not recompute)"
            : liveSource}
        </p>
      </header>

      {benchmark && (
        <div className="alert alert-info benchmark-banner" role="status" data-testid="benchmark-banner">
          <div className="alert-content">
            <span>
              Viewing benchmark map{benchmark.index != null ? ` #${benchmark.index}` : ""} (seed{" "}
              {benchmark.seed}, {benchmark.n_nodes} nodes)
              {isEdited ? " with your edits" : ""}
            </span>
            <button type="button" className="btn btn-sm btn-secondary" onClick={handleBackToDemo}>
              Back to demo scenario
            </button>
          </div>
        </div>
      )}

      <nav className="tabs" role="tablist" aria-label="Raid Optimizer Modules">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={active === t.id}
            className={`tab-btn ${active === t.id ? "active" : ""}`}
            onClick={() => setActive(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <Status loading={loading} error={error}>
        <ScenarioPanel
          scenario={scenario}
          onChange={setEdited}
          onReset={handleResetScenario}
          isEdited={isEdited}
        />
        <div className="tab-container" role="tabpanel">
          <ActiveComponent scenario={scenario} benchmark={benchmark} onLoadScenario={loadScenario} />
        </div>
      </Status>
    </main>
  );
}
