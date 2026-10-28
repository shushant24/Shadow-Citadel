import React, { useState } from "react";
import { api, USE_FIXTURES } from "./api.js";
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
  const { loading, error, data: scenario } = useApi(() => api.scenario(), []);
  const Active = TABS.find((t) => t.id === active).Component;

  return (
    <main className="app">
      <h1>Shadow Citadel Raid Optimizer</h1>
      <p className="todo">Data source: {USE_FIXTURES ? "fixtures (offline)" : "live API"}</p>
      <nav className="tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={active === t.id} onClick={() => setActive(t.id)}>
            {t.label}
          </button>
        ))}
      </nav>
      <Status loading={loading} error={error}>
        <ScenarioPanel scenario={scenario} />
        <Active scenario={scenario} />
      </Status>
    </main>
  );
}
