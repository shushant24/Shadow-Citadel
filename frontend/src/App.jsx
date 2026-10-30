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
  // `edited` holds the user's changes from ScenarioPanel; every tab receives the edited scenario if there is one.
  const [edited, setEdited] = useState(null);
  const scenario = edited ?? loaded;
  const Active = TABS.find((t) => t.id === active).Component;

  return (
    <main className="app">
      <h1>Shadow Citadel Raid Optimizer</h1>
      <p className="todo" title={USE_FIXTURES ? FIXTURE_LIMITS : undefined}>
        Data source: {USE_FIXTURES ? "fixtures (offline, canned results: sliders, drag and edits do not recompute)" : "live API"}
      </p>
      <nav className="tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={active === t.id} onClick={() => setActive(t.id)}>
            {t.label}
          </button>
        ))}
      </nav>
      <Status loading={loading} error={error}>
        <ScenarioPanel scenario={scenario} onChange={setEdited} />
        <Active scenario={scenario} />
      </Status>
    </main>
  );
}
