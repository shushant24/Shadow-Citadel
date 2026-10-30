import React, { useState } from "react";
import { api, USE_FIXTURES, FIXTURE_LIMITS } from "./api.js";
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

  // `edited` holds user-modified scenario fields from ScenarioPanel.
  // Every downstream tab receives the active scenario.
  const [edited, setEdited] = useState(null);
  const scenario = edited ?? loaded;
  const isEdited = edited !== null;

  const ActiveComponent = TABS.find((t) => t.id === active)?.Component ?? MapTab;

  const handleResetScenario = () => {
    setEdited(null);
  };

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
            : "live API (connected to http://localhost:8000)"}
        </p>
      </header>

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
          <ActiveComponent scenario={scenario} />
        </div>
      </Status>
    </main>
  );
}
