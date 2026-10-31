import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { api, USE_FIXTURES } from "../api.js";
import { useApi } from "../useApi.js";
import Status from "../components/Status.jsx";
import StepPlayer from "../components/StepPlayer.jsx";

// Cross product of vectors OA and OB
function crossProduct(o, a, b) {
  return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
}

// Client-side Convex Hull (Monotone Chain / Graham scan) for interactive dragging with step tracking
function computeLocalHull(pointsDict) {
  const points = Object.entries(pointsDict).map(([name, [x, y]]) => ({
    name,
    x: Number(x),
    y: Number(y),
  }));

  if (points.length <= 3) {
    const vertices = points.map((p) => p.name);
    return {
      vertices,
      interior: [],
      steps: vertices.map((v, i) => ({
        action: "push",
        point: v,
        stack: vertices.slice(0, i + 1),
      })),
    };
  }

  const steps = [];
  const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  const lower = [];
  for (const p of sorted) {
    while (
      lower.length >= 2 &&
      crossProduct(lower[lower.length - 2], lower[lower.length - 1], p) <= 0
    ) {
      const popped = lower.pop();
      steps.push({
        action: "pop",
        point: popped.name,
        stack: lower.map((pt) => pt.name),
      });
    }
    lower.push(p);
    steps.push({
      action: "push",
      point: p.name,
      stack: lower.map((pt) => pt.name),
    });
  }

  const upper = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i];
    while (
      upper.length >= 2 &&
      crossProduct(upper[upper.length - 2], upper[upper.length - 1], p) <= 0
    ) {
      const popped = upper.pop();
      steps.push({
        action: "pop",
        point: popped.name,
        stack: [...lower.slice(0, -1), ...upper].map((pt) => pt.name),
      });
    }
    upper.push(p);
    steps.push({
      action: "push",
      point: p.name,
      stack: [...lower.slice(0, -1), ...upper].map((pt) => pt.name),
    });
  }

  lower.pop();
  upper.pop();
  const hullPoints = [...lower, ...upper];

  // Rotate so Base is first if present
  const baseIdx = hullPoints.findIndex((p) => p.name === "Base");
  let oriented = hullPoints;
  if (baseIdx > 0) {
    oriented = [...hullPoints.slice(baseIdx), ...hullPoints.slice(0, baseIdx)];
  }

  const vertices = oriented.map((p) => p.name);
  const vSet = new Set(vertices);
  const interior = points.filter((p) => !vSet.has(p.name)).map((p) => p.name);

  return { vertices, interior, steps };
}

// Client-side TSP solver (Rounded Euclidean, matching Section 3.2)
function computeLocalTSP(nodesDict) {
  const labels = Object.keys(nodesDict);
  const n = labels.length;
  if (n === 0) {
    return {
      tour: [],
      cost: 0,
      nearest_neighbour: { tour: [], cost: 0 },
      steps: [],
    };
  }
  if (n === 1) {
    return {
      tour: [labels[0], labels[0]],
      cost: 0,
      nearest_neighbour: { tour: [labels[0], labels[0]], cost: 0 },
      steps: [{ node: 1, cost: 0, status: "optimal", subtours: [[labels[0]]], forbidden_arcs: [] }],
    };
  }

  const matrix = Array.from({ length: n }, () => Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    const p1 = nodesDict[labels[i]];
    for (let j = 0; j < n; j++) {
      if (i === j) {
        matrix[i][j] = 0;
      } else {
        const p2 = nodesDict[labels[j]];
        matrix[i][j] = Math.round(Math.hypot(p1[0] - p2[0], p1[1] - p2[1]));
      }
    }
  }

  // Nearest neighbour from first label (Base)
  const visited = new Set([0]);
  let curr = 0;
  const nnPath = [0];
  let nnCost = 0;

  while (visited.size < n) {
    let next = -1;
    let minDist = Infinity;
    for (let j = 0; j < n; j++) {
      if (!visited.has(j) && matrix[curr][j] < minDist) {
        minDist = matrix[curr][j];
        next = j;
      }
    }
    if (next === -1) break;
    visited.add(next);
    nnCost += minDist;
    curr = next;
    nnPath.push(curr);
  }
  nnCost += matrix[curr][0];
  nnPath.push(0);

  // Exact Branch-and-bound optimal TSP search
  let bestTour = nnPath.map((idx) => labels[idx]);
  let bestCost = nnCost;

  const currentPath = [0];
  const searchVisited = new Array(n).fill(false);
  searchVisited[0] = true;

  function search(node, count, currentCost) {
    if (count === n) {
      const returnCost = matrix[node][0];
      const total = currentCost + returnCost;
      if (total < bestCost) {
        bestCost = total;
        bestTour = [...currentPath.map((idx) => labels[idx]), labels[0]];
      }
      return;
    }
    if (currentCost >= bestCost) return;

    for (let next = 1; next < n; next++) {
      if (!searchVisited[next]) {
        const edgeCost = matrix[node][next];
        if (currentCost + edgeCost < bestCost) {
          searchVisited[next] = true;
          currentPath.push(next);
          search(next, count + 1, currentCost + edgeCost);
          currentPath.pop();
          searchVisited[next] = false;
        }
      }
    }
  }

  search(0, 1, 0);

  const steps = [
    {
      node: 1,
      cost: nnCost,
      status: "feasible",
      subtours: [nnPath.map((idx) => labels[idx])],
      forbidden_arcs: [],
    },
    {
      node: 2,
      cost: bestCost,
      status: "optimal",
      subtours: [bestTour],
      forbidden_arcs: [],
    },
  ];

  return {
    tour: bestTour,
    cost: bestCost,
    nearest_neighbour: {
      tour: nnPath.map((idx) => labels[idx]),
      cost: nnCost,
    },
    steps,
  };
}

function arePointsEqual(ptsA, ptsB) {
  if (!ptsA || !ptsB) return ptsA === ptsB;
  const keysA = Object.keys(ptsA);
  const keysB = Object.keys(ptsB);
  if (keysA.length !== keysB.length) return false;
  return keysA.every((k) => ptsB[k] && ptsA[k][0] === ptsB[k][0] && ptsA[k][1] === ptsB[k][1]);
}

export default function MapTab({ scenario }) {
  // Sync coordinates with scenario prop, allow dragging
  const [nodes, setNodes] = useState(scenario?.nodes || {});
  const [loot, setLoot] = useState(scenario?.loot || {});
  const [liveRouteData, setLiveRouteData] = useState(null);
  const [liveHullData, setLiveHullData] = useState(null);

  useEffect(() => {
    if (scenario?.nodes) setNodes(scenario.nodes);
    if (scenario?.loot) setLoot(scenario.loot);
    setLiveRouteData(null);
    setLiveHullData(null);
  }, [scenario]);

  // View state
  const [tourMode, setTourMode] = useState("optimal"); // 'optimal' | 'nearest_neighbour' | 'both'
  const [showHull, setShowHull] = useState(true);
  const [showSubtours, setShowSubtours] = useState(false);
  const [showEdgeWeights, setShowEdgeWeights] = useState(true);
  const [activeStepType, setActiveStepType] = useState("tsp"); // 'tsp' | 'hull'
  const [draggedNode, setDraggedNode] = useState(null);

  const svgRef = useRef(null);

  const allPoints = useMemo(() => ({ ...nodes, ...loot }), [nodes, loot]);

  // Check if current coordinates differ from original scenario props
  const isNodesModified = useMemo(
    () => !arePointsEqual(nodes, scenario?.nodes),
    [nodes, scenario?.nodes]
  );
  const isLootModified = useMemo(
    () => !arePointsEqual(loot, scenario?.loot),
    [loot, scenario?.loot]
  );
  const isModified = isNodesModified || isLootModified;

  // Fetch initial scenario hull and route envelopes
  const { loading: hullLoading, error: hullError, data: hullData } = useApi(
    () => api.hull(allPoints),
    [scenario?.nodes, scenario?.loot]
  );

  const { loading: routeLoading, error: routeError, data: routeData } = useApi(
    () => api.route({ points: nodes }),
    [scenario?.nodes]
  );

  // Compute live values when dragging
  const localHull = useMemo(() => computeLocalHull(allPoints), [allPoints]);
  const localTSP = useMemo(() => computeLocalTSP(nodes), [nodes]);

  // When points are modified, prioritize live committed API data or immediate local computation
  const hullVertices = isModified
    ? (liveHullData?.answer?.vertices || localHull.vertices)
    : (hullData?.answer?.vertices || localHull.vertices);

  const hullInterior = isModified
    ? (liveHullData?.answer?.interior || localHull.interior)
    : (hullData?.answer?.interior || localHull.interior);

  const hullSteps = isModified
    ? (liveHullData?.steps || localHull.steps)
    : (hullData?.steps || localHull.steps);

  const optimalTour = isNodesModified
    ? (liveRouteData?.answer?.tour || localTSP.tour)
    : (routeData?.answer?.tour || localTSP.tour);

  const optimalCost = isNodesModified
    ? (liveRouteData?.answer?.cost ?? localTSP.cost)
    : (routeData?.answer?.cost ?? localTSP.cost);

  const nnTour = isNodesModified
    ? (liveRouteData?.answer?.nearest_neighbour?.tour || localTSP.nearest_neighbour.tour)
    : (routeData?.answer?.nearest_neighbour?.tour || localTSP.nearest_neighbour.tour);

  const nnCost = isNodesModified
    ? (liveRouteData?.answer?.nearest_neighbour?.cost ?? localTSP.nearest_neighbour.cost)
    : (routeData?.answer?.nearest_neighbour?.cost ?? localTSP.nearest_neighbour.cost);

  const routeSteps = isNodesModified
    ? (liveRouteData?.steps || localTSP.steps)
    : (routeData?.steps || localTSP.steps);

  const getNodeCoord = (name) => nodes[name] || loot[name] || [0, 0];

  // Subtours from first Hungarian pass
  const rawSubtours = (isNodesModified && liveRouteData?.answer?.first_subtours)
    ? liveRouteData.answer.first_subtours
    : (routeData?.answer?.first_subtours || [
        ["Base", "C7", "C5"],
        ["C1", "C6", "C3", "C4", "C2"],
      ]);

  // Ensure subtours are closed loops and compute individual & total costs dynamically
  const subtoursInfo = useMemo(() => {
    return rawSubtours.map((sub, sIdx) => {
      const closed =
        sub.length > 0 && sub[sub.length - 1] !== sub[0] ? [...sub, sub[0]] : sub;
      let cost = 0;
      for (let i = 0; i < closed.length - 1; i++) {
        const p1 = getNodeCoord(closed[i]);
        const p2 = getNodeCoord(closed[i + 1]);
        cost += Math.round(Math.hypot(p1[0] - p2[0], p1[1] - p2[1]));
      }
      return {
        id: sIdx + 1,
        closed,
        cost,
        path: closed.join(" → "),
      };
    });
  }, [rawSubtours, nodes, loot]);

  const subtourTotalCost = useMemo(() => {
    if (!isNodesModified && routeData?.answer?.relaxation_cost != null) {
      return routeData.answer.relaxation_cost;
    }
    return subtoursInfo.reduce((acc, sub) => acc + sub.cost, 0);
  }, [subtoursInfo, isNodesModified, routeData]);

  // SVG coordinate transformation
  const viewBoxWidth = 840;
  const viewBoxHeight = 600;
  const padding = 55;
  const minX = -2;
  const maxX = 26;
  const minY = -2;
  const maxY = 26;

  const toSvgX = useCallback(
    (x) => padding + ((x - minX) / (maxX - minX)) * (viewBoxWidth - 2 * padding),
    []
  );

  const toSvgY = useCallback(
    (y) =>
      viewBoxHeight -
      padding -
      ((y - minY) / (maxY - minY)) * (viewBoxHeight - 2 * padding),
    []
  );

  const toWorldX = useCallback((svgX) => {
    const clampedX = Math.max(padding, Math.min(viewBoxWidth - padding, svgX));
    return Math.round(minX + ((clampedX - padding) / (viewBoxWidth - 2 * padding)) * (maxX - minX));
  }, []);

  const toWorldY = useCallback((svgY) => {
    const clampedY = Math.max(padding, Math.min(viewBoxHeight - padding, svgY));
    return Math.round(
      minY +
        ((viewBoxHeight - padding - clampedY) / (viewBoxHeight - 2 * padding)) *
          (maxY - minY)
    );
  }, []);

  // Dragging event handlers
  const handlePointerDown = (name, isLoot, e) => {
    e.stopPropagation();
    try {
      e.target.setPointerCapture(e.pointerId);
    } catch (_) {}
    setDraggedNode({ name, isLoot });
  };

  const handlePointerMove = (e) => {
    if (!draggedNode || !svgRef.current) return;
    const clientX = e.clientX ?? e.pageX ?? 0;
    const clientY = e.clientY ?? e.pageY ?? 0;
    const rect = svgRef.current.getBoundingClientRect();
    const width = rect.width || viewBoxWidth;
    const height = rect.height || viewBoxHeight;
    const left = rect.left || 0;
    const top = rect.top || 0;
    const scaleX = viewBoxWidth / width;
    const scaleY = viewBoxHeight / height;
    const svgX = (clientX - left) * scaleX;
    const svgY = (clientY - top) * scaleY;

    const wx = toWorldX(svgX);
    const wy = toWorldY(svgY);

    if (draggedNode.isLoot) {
      setLoot((prev) => ({ ...prev, [draggedNode.name]: [wx, wy] }));
    } else {
      setNodes((prev) => ({ ...prev, [draggedNode.name]: [wx, wy] }));
    }
  };

  const handlePointerUp = (e) => {
    if (draggedNode) {
      const active = draggedNode;
      try {
        if (e?.target?.releasePointerCapture && e?.pointerId != null) {
          e.target.releasePointerCapture(e.pointerId);
        }
      } catch (_) {}
      setDraggedNode(null);

      // On commit, if coordinates are modified and in live mode, invoke the live backend
      if (!USE_FIXTURES) {
        if (!active.isLoot) {
          api.route({ points: nodes }).then(setLiveRouteData).catch(console.error);
        }
        api.hull({ ...nodes, ...loot }).then(setLiveHullData).catch(console.error);
      }
    }
  };

  const handleResetCoordinates = () => {
    if (scenario?.nodes) setNodes(scenario.nodes);
    if (scenario?.loot) setLoot(scenario.loot);
    setLiveRouteData(null);
    setLiveHullData(null);
  };

  // Hull polygon points
  const hullPointsString = useMemo(() => {
    if (!hullVertices || hullVertices.length < 3) return "";
    return hullVertices
      .map((name) => {
        const pt = getNodeCoord(name);
        return `${toSvgX(pt[0])},${toSvgY(pt[1])}`;
      })
      .join(" ");
  }, [hullVertices, nodes, loot, toSvgX, toSvgY]);

  // Raid time budget calculations (Section 4 Stage 4 dependency: minimum 42 min required for feasibility)
  const totalRaidTime = scenario?.total_time ?? 120;
  const optimalTimeLeft = Math.max(0, totalRaidTime - optimalCost);
  const nnTimeLeft = Math.max(0, totalRaidTime - nnCost);
  const timeSaved = nnCost - optimalCost;
  const timeSavedPercent = nnCost > 0 ? (((nnCost - optimalCost) / nnCost) * 100).toFixed(1) : "0.0";
  const minFeasibleCraftTime = 42;

  return (
    <section className="panel map-tab-panel" aria-label="Map">
      {/* Header bar */}
      <div className="map-header-row">
        <div>
          <h2>Map & Tour Optimization</h2>
          <p className="tab-subtitle">
            Stage 1: Convex Hull Safe Territory · Stage 2: TSP Checkpoint Tour (Hungarian + Branch & Bound)
          </p>
        </div>
        <div className="header-actions">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleResetCoordinates}
            title="Reset dragged points to default scenario"
          >
            Reset Coordinates
          </button>
        </div>
      </div>

      <Status loading={hullLoading || routeLoading} error={hullError || routeError}>
        {/* Metric Cards Banner */}
        <div className="map-metrics-banner">
          <div className="metric-box metric-optimal">
            <div className="metric-tag">Stage 2 Winner</div>
            <div className="metric-val">{optimalCost} <span className="unit">min</span></div>
            <div className="metric-lbl">Optimal Tour (B&B)</div>
            <div className="metric-sub">
              Remaining craft time: <strong>{optimalTimeLeft} min</strong>{" "}
              <span className={optimalTimeLeft >= minFeasibleCraftTime ? "text-ok" : "text-warn"}>
                ({optimalTimeLeft >= minFeasibleCraftTime ? "Feasible" : "Infeasible"})
              </span>
            </div>
          </div>

          <div className="metric-box metric-baseline">
            <div className="metric-tag tag-warn">Baseline (-{timeSavedPercent}%)</div>
            <div className="metric-val">{nnCost} <span className="unit">min</span></div>
            <div className="metric-lbl">Nearest Neighbour</div>
            <div className="metric-sub">
              Remaining craft time: <strong>{nnTimeLeft} min</strong>{" "}
              <span className={nnTimeLeft >= minFeasibleCraftTime ? "text-ok" : "text-danger"}>
                ({nnTimeLeft >= minFeasibleCraftTime ? "Feasible" : "Infeasible"})
              </span>
            </div>
          </div>

          <div className="metric-box metric-savings">
            <div className="metric-tag tag-ok">Optimization Gain</div>
            <div className="metric-val">+{timeSaved} <span className="unit">min</span></div>
            <div className="metric-lbl">{timeSavedPercent}% Faster Route</div>
            <div className="metric-sub">Enables Stage 4 crafting plan</div>
          </div>

          <div className="metric-box metric-hull">
            <div className="metric-tag">Stage 1 Safe Zone</div>
            <div className="metric-val">{hullVertices.length} <span className="unit">vertices</span></div>
            <div className="metric-lbl">Convex Hull Boundary</div>
            <div className="metric-sub">{hullInterior.length} interior points enclosed</div>
          </div>
        </div>

        {/* Chaining Notice */}
        <div className="chaining-callout">
          <span className="callout-icon">⚡</span>
          <div>
            <strong>Stage 2 feeds Stage 4:</strong> The {totalRaidTime}-minute limit leaves <strong>{optimalTimeLeft} min</strong> with the {optimalCost}-minute optimal tour ({optimalTimeLeft >= minFeasibleCraftTime ? "Z = 117 feasible score" : "infeasible crafting plan"}).
            With the {nnCost}-minute nearest-neighbour tour, only <strong>{nnTimeLeft} min</strong> remain, making the crafting plan{" "}
            <span className={nnTimeLeft >= minFeasibleCraftTime ? "badge-ok" : "badge-danger"}>
              {nnTimeLeft >= minFeasibleCraftTime ? "FEASIBLE" : "INFEASIBLE"}
            </span>.
          </div>
        </div>

        {/* Toolbar Controls */}
        <div className="map-toolbar">
          <div className="control-group">
            <span className="ctrl-label">Tour Mode:</span>
            <div className="segmented-tabs">
              <button
                type="button"
                className={`segment-tab ${tourMode === "optimal" ? "active" : ""}`}
                onClick={() => setTourMode("optimal")}
              >
                Optimal Tour ({optimalCost}m)
              </button>
              <button
                type="button"
                className={`segment-tab ${tourMode === "nearest_neighbour" ? "active" : ""}`}
                onClick={() => setTourMode("nearest_neighbour")}
              >
                Nearest Neighbour ({nnCost}m)
              </button>
              <button
                type="button"
                className={`segment-tab ${tourMode === "both" ? "active" : ""}`}
                onClick={() => setTourMode("both")}
              >
                Compare Both
              </button>
            </div>
          </div>

          <div className="control-group">
            <span className="ctrl-label">Overlays:</span>
            <button
              type="button"
              className={`pill-btn ${showHull ? "active" : ""}`}
              onClick={() => setShowHull(!showHull)}
            >
              Convex Hull
            </button>
            <button
              type="button"
              className={`pill-btn pill-danger ${showSubtours ? "active" : ""}`}
              onClick={() => setShowSubtours(!showSubtours)}
              title="Show first Hungarian relaxation disjoint subtours"
            >
              Subtours ({subtourTotalCost}m)
            </button>
            <button
              type="button"
              className={`pill-btn ${showEdgeWeights ? "active" : ""}`}
              onClick={() => setShowEdgeWeights(!showEdgeWeights)}
            >
              Edge Times
            </button>
          </div>
        </div>

        {/* Subtour Alert Banner */}
        {showSubtours && (
          <div className="subtours-explanation-banner">
            <div className="banner-title">
              ⚠️ Hungarian Relaxation Subtours (Pass 1 Cost: {subtourTotalCost} minutes)
            </div>
            <div className="banner-desc">
              The assignment relaxation without subtour elimination produces {subtoursInfo.length} disjoint loops:
              <ul>
                {subtoursInfo.map((sub) => (
                  <li key={`subtour-desc-${sub.id}`}>
                    <strong>Subtour {sub.id} ({sub.cost}m):</strong> {sub.path}
                  </li>
                ))}
              </ul>
              <em>Visual proof that the Hungarian relaxation alone is not a valid tour. Branch-and-bound resolves this to the optimal {optimalCost}-minute tour.</em>
            </div>
          </div>
        )}

        {/* Main Map SVG and Itinerary Layout */}
        <div className="map-content-grid">
          {/* Interactive SVG Canvas */}
          <div className="svg-frame">
            <svg
              ref={svgRef}
              className={`map-svg-canvas ${draggedNode ? "is-dragging" : ""}`}
              viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
              style={{ touchAction: "none" }}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              role="img"
              aria-label="Shadow Citadel Raid Map"
            >
              <defs>
                {/* Directional Arrowheads */}
                <marker
                  id="arrow-opt"
                  viewBox="0 0 10 10"
                  refX="17"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#38bdf8" />
                </marker>
                <marker
                  id="arrow-nn"
                  viewBox="0 0 10 10"
                  refX="17"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#f59e0b" />
                </marker>
                <marker
                  id="arrow-sub1"
                  viewBox="0 0 10 10"
                  refX="17"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#ef476f" />
                </marker>
                <marker
                  id="arrow-sub2"
                  viewBox="0 0 10 10"
                  refX="17"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#a855f7" />
                </marker>

                {/* Safe zone fill gradient */}
                <linearGradient id="safeZoneGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.16" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.06" />
                </linearGradient>

                {/* Subtle grid pattern */}
                <pattern id="grid" width="35" height="35" patternUnits="userSpaceOnUse">
                  <path d="M 35 0 L 0 0 0 35" fill="none" stroke="#1f293d" strokeWidth="0.8" />
                </pattern>
              </defs>

              {/* Grid Background */}
              <rect x="0" y="0" width={viewBoxWidth} height={viewBoxHeight} fill="url(#grid)" />

              {/* Axes and Ticks */}
              <line
                x1={toSvgX(minX)}
                y1={toSvgY(0)}
                x2={toSvgX(maxX)}
                y2={toSvgY(0)}
                stroke="#334155"
                strokeWidth="1.2"
                strokeDasharray="4 4"
              />
              <line
                x1={toSvgX(0)}
                y1={toSvgY(minY)}
                x2={toSvgX(0)}
                y2={toSvgY(maxY)}
                stroke="#334155"
                strokeWidth="1.2"
                strokeDasharray="4 4"
              />

              {[0, 5, 10, 15, 20, 25].map((val) => (
                <g key={`grid-tick-${val}`}>
                  <text
                    x={toSvgX(val)}
                    y={toSvgY(0) + 15}
                    fill="#64748b"
                    fontSize="10"
                    fontFamily="monospace"
                    textAnchor="middle"
                  >
                    {val}
                  </text>
                  <text
                    x={toSvgX(0) - 8}
                    y={toSvgY(val) + 4}
                    fill="#64748b"
                    fontSize="10"
                    fontFamily="monospace"
                    textAnchor="end"
                  >
                    {val}
                  </text>
                </g>
              ))}

              {/* Convex Hull Safe Zone Polygon */}
              {showHull && hullPointsString && (
                <g className="hull-polygon-group">
                  <polygon
                    points={hullPointsString}
                    fill="url(#safeZoneGrad)"
                    stroke="#8b5cf6"
                    strokeWidth="2"
                    strokeDasharray="6 4"
                  />
                  <text
                    x={toSvgX(12)}
                    y={toSvgY(22)}
                    fill="#a78bfa"
                    fontSize="11"
                    fontWeight="600"
                    textAnchor="middle"
                    letterSpacing="1"
                  >
                    SAFE ZONE (CONVEX HULL)
                  </text>
                </g>
              )}

              {/* First Hungarian Pass Subtours Overlay (Closed Loops) */}
              {showSubtours && (
                <g className="subtours-group">
                  {subtoursInfo.map((subInfo, sIdx) => {
                    const color = sIdx === 0 ? "#ef476f" : "#a855f7";
                    const markerId = sIdx === 0 ? "arrow-sub1" : "arrow-sub2";
                    const segments = [];
                    const closed = subInfo.closed;

                    for (let i = 0; i < closed.length - 1; i++) {
                      const p1 = getNodeCoord(closed[i]);
                      const p2 = getNodeCoord(closed[i + 1]);
                      segments.push(
                        <line
                          key={`sub-${sIdx}-seg-${i}`}
                          x1={toSvgX(p1[0])}
                          y1={toSvgY(p1[1])}
                          x2={toSvgX(p2[0])}
                          y2={toSvgY(p2[1])}
                          stroke={color}
                          strokeWidth="2.5"
                          strokeDasharray="5 5"
                          markerEnd={`url(#${markerId})`}
                        />
                      );
                    }
                    return <g key={`subtour-${sIdx}`}>{segments}</g>;
                  })}
                </g>
              )}

              {/* Nearest Neighbour Tour Edges */}
              {(tourMode === "nearest_neighbour" || tourMode === "both") && (
                <g className="nn-tour-group">
                  {nnTour.map((from, idx) => {
                    if (idx === nnTour.length - 1) return null;
                    const to = nnTour[idx + 1];
                    const p1 = getNodeCoord(from);
                    const p2 = getNodeCoord(to);
                    const x1 = toSvgX(p1[0]);
                    const y1 = toSvgY(p1[1]);
                    const x2 = toSvgX(p2[0]);
                    const y2 = toSvgY(p2[1]);
                    const dist = Math.round(Math.hypot(p1[0] - p2[0], p1[1] - p2[1]));

                    return (
                      <g key={`nn-edge-${from}-${to}-${idx}`}>
                        <line
                          x1={x1}
                          y1={y1}
                          x2={x2}
                          y2={y2}
                          stroke="#f59e0b"
                          strokeWidth="2.2"
                          strokeDasharray={tourMode === "both" ? "6 4" : "none"}
                          markerEnd="url(#arrow-nn)"
                        />
                        {showEdgeWeights && (
                          <g transform={`translate(${(x1 + x2) / 2}, ${(y1 + y2) / 2})`}>
                            <rect x="-13" y="-9" width="26" height="16" rx="4" fill="#181e2b" stroke="#f59e0b" strokeWidth="0.8" />
                            <text x="0" y="3" fill="#fbbf24" fontSize="9" fontFamily="monospace" textAnchor="middle">{dist}m</text>
                          </g>
                        )}
                      </g>
                    );
                  })}
                </g>
              )}

              {/* Optimal Tour Edges (Cyan) */}
              {(tourMode === "optimal" || tourMode === "both") && (
                <g className="optimal-tour-group">
                  {optimalTour.map((from, idx) => {
                    if (idx === optimalTour.length - 1) return null;
                    const to = optimalTour[idx + 1];
                    const p1 = getNodeCoord(from);
                    const p2 = getNodeCoord(to);
                    const x1 = toSvgX(p1[0]);
                    const y1 = toSvgY(p1[1]);
                    const x2 = toSvgX(p2[0]);
                    const y2 = toSvgY(p2[1]);
                    const dist = Math.round(Math.hypot(p1[0] - p2[0], p1[1] - p2[1]));

                    return (
                      <g key={`opt-edge-${from}-${to}-${idx}`}>
                        <line
                          x1={x1}
                          y1={y1}
                          x2={x2}
                          y2={y2}
                          stroke="#38bdf8"
                          strokeWidth="2.8"
                          markerEnd="url(#arrow-opt)"
                        />
                        {showEdgeWeights && (
                          <g transform={`translate(${(x1 + x2) / 2}, ${(y1 + y2) / 2})`}>
                            <rect x="-13" y="-9" width="26" height="16" rx="4" fill="#082f49" stroke="#38bdf8" strokeWidth="0.8" />
                            <text x="0" y="3" fill="#7dd3fc" fontSize="9" fontWeight="600" fontFamily="monospace" textAnchor="middle">{dist}m</text>
                          </g>
                        )}
                      </g>
                    );
                  })}
                </g>
              )}

              {/* Loot Drops Markers (L1 to L4, Diamonds) */}
              <g className="loot-layer">
                {Object.entries(loot).map(([name, [x, y]]) => {
                  const svgX = toSvgX(x);
                  const svgY = toSvgY(y);
                  const isHull = hullVertices.includes(name);

                  return (
                    <g
                      key={`loot-pt-${name}`}
                      transform={`translate(${svgX}, ${svgY})`}
                      className={`map-pt loot-pt ${draggedNode?.name === name ? "dragging" : ""}`}
                      onPointerDown={(e) => handlePointerDown(name, true, e)}
                      cursor="grab"
                    >
                      <polygon
                        points="0,-11 11,0 0,11 -11,0"
                        fill="#064e3b"
                        stroke="#10b981"
                        strokeWidth={isHull ? "2.5" : "1.5"}
                      />
                      <circle cx="0" cy="0" r="3" fill="#34d399" />
                      <text
                        x="0"
                        y="20"
                        fill="#6ee7b7"
                        fontSize="10"
                        fontWeight="600"
                        fontFamily="monospace"
                        textAnchor="middle"
                      >
                        {name + " (" + x + "," + y + ")"}
                      </text>
                    </g>
                  );
                })}
              </g>

              {/* Checkpoints & Base Markers */}
              <g className="nodes-layer">
                {Object.entries(nodes).map(([name, [x, y]]) => {
                  const svgX = toSvgX(x);
                  const svgY = toSvgY(y);
                  const isBase = name === "Base";
                  const isHull = hullVertices.includes(name);
                  const optIdx = optimalTour.indexOf(name);
                  const orderBadge = optIdx > 0 ? `#${optIdx}` : isBase ? "START" : "";

                  return (
                    <g
                      key={`node-pt-${name}`}
                      transform={`translate(${svgX}, ${svgY})`}
                      className={`map-pt node-pt ${isBase ? "is-base" : ""} ${draggedNode?.name === name ? "dragging" : ""}`}
                      onPointerDown={(e) => handlePointerDown(name, false, e)}
                      cursor="grab"
                    >
                      <circle
                        cx="0"
                        cy="0"
                        r={isBase ? 15 : 12}
                        fill={isBase ? "#78350f" : "#0c4a6e"}
                        stroke={isBase ? "#fbbf24" : "#38bdf8"}
                        strokeWidth={isHull ? "2.5" : "1.5"}
                      />
                      <circle cx="0" cy="0" r={isBase ? 5 : 3.5} fill={isBase ? "#fde047" : "#bae6fd"} />

                      {orderBadge && (
                        <g transform="translate(10, -11)">
                          <rect
                            x="-9"
                            y="-7"
                            width={isBase ? "32" : "18"}
                            height="13"
                            rx="3"
                            fill="#0284c7"
                            stroke="#e0f2fe"
                            strokeWidth="0.8"
                          />
                          <text
                            x={isBase ? "7" : "0"}
                            y="2.5"
                            fill="#ffffff"
                            fontSize="8"
                            fontWeight="bold"
                            textAnchor="middle"
                          >
                            {orderBadge}
                          </text>
                        </g>
                      )}

                      <text
                        x="0"
                        y="-16"
                        fill={isBase ? "#fde047" : "#e0f2fe"}
                        fontSize="11"
                        fontWeight="bold"
                        fontFamily="monospace"
                        textAnchor="middle"
                      >
                        {name + " (" + x + "," + y + ")"}
                      </text>
                    </g>
                  );
                })}
              </g>

              {/* Dragging tooltip */}
              {draggedNode && (
                <g
                  transform={`translate(${toSvgX(
                    draggedNode.isLoot ? loot[draggedNode.name][0] : nodes[draggedNode.name][0]
                  )}, ${
                    toSvgY(
                      draggedNode.isLoot ? loot[draggedNode.name][1] : nodes[draggedNode.name][1]
                    ) - 30
                  })`}
                >
                  <rect x="-40" y="-10" width="80" height="20" rx="4" fill="#0f172a" stroke="#38bdf8" />
                  <text x="0" y="4" fill="#38bdf8" fontSize="10" fontFamily="monospace" textAnchor="middle">
                    {draggedNode.name + ": (" +
                      (draggedNode.isLoot
                        ? loot[draggedNode.name][0] + ", " + loot[draggedNode.name][1]
                        : nodes[draggedNode.name][0] + ", " + nodes[draggedNode.name][1]) +
                      ")"}
                  </text>
                </g>
              )}
            </svg>
            <div className="drag-hint">
              <span>💡 Tip: Click and drag any node or loot drop directly on the map to recompute the route and hull in real-time.</span>
            </div>
          </div>

          {/* Sidebar Itinerary Table & Coordinates */}
          <div className="map-sidebar">
            <div className="itinerary-panel">
              <div className="panel-title">
                {tourMode === "nearest_neighbour"
                  ? `Nearest Neighbour Itinerary (${nnCost} min)`
                  : `Optimal Tour Itinerary (${optimalCost} min)`}
              </div>

              <div className="itinerary-table-container">
                <table className="itinerary-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>From</th>
                      <th>To</th>
                      <th>Time</th>
                      <th>Cumul.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const active = tourMode === "nearest_neighbour" ? nnTour : optimalTour;
                      let cumul = 0;
                      return active.map((from, idx) => {
                        if (idx === active.length - 1) return null;
                        const to = active[idx + 1];
                        const p1 = getNodeCoord(from);
                        const p2 = getNodeCoord(to);
                        const legTime = Math.round(Math.hypot(p1[0] - p2[0], p1[1] - p2[1]));
                        cumul += legTime;
                        return (
                          <tr key={`itinerary-leg-${from}-${to}-${idx}`}>
                            <td className="text-muted">#{idx + 1}</td>
                            <td><strong>{from}</strong></td>
                            <td><strong>{to}</strong></td>
                            <td className="text-accent">{legTime}m</td>
                            <td className="text-muted">{cumul}m</td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan="3">Total Tour Time</td>
                      <td colSpan="2" className={`total-cell ${tourMode === "nearest_neighbour" ? "text-warn" : "text-accent"}`}>
                        {tourMode === "nearest_neighbour" ? nnCost : optimalCost} min
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Step Player Integration */}
            <div className="stepper-wrapper-card">
              <div className="stepper-header-tabs">
                <button
                  type="button"
                  className={`tab-toggle ${activeStepType === "tsp" ? "active" : ""}`}
                  onClick={() => setActiveStepType("tsp")}
                >
                  TSP Branch & Bound
                </button>
                <button
                  type="button"
                  className={`tab-toggle ${activeStepType === "hull" ? "active" : ""}`}
                  onClick={() => setActiveStepType("hull")}
                >
                  Convex Hull Scan
                </button>
              </div>

              {activeStepType === "tsp" && (
                <StepPlayer steps={routeSteps || []}>
                  {(step, idx) => (
                    <div className="step-content-card">
                      <div className="step-title-line">
                        <strong>Node {step?.node ?? idx + 1}</strong>: {step?.status?.toUpperCase()}
                        {step?.cost != null && <span className="step-cost">Cost: {step.cost}m</span>}
                      </div>
                      {step?.forbidden_arcs?.length > 0 && (
                        <div className="step-sub">
                          Forbidden: {step.forbidden_arcs.map((a) => `(${a.join("→")})`).join(", ")}
                        </div>
                      )}
                      {step?.subtours?.length > 0 && (
                        <div className="step-sub text-muted">
                          Subtours: {step.subtours.map((t) => t.join("→")).join(" | ")}
                        </div>
                      )}
                    </div>
                  )}
                </StepPlayer>
              )}

              {activeStepType === "hull" && (
                <StepPlayer steps={hullSteps || []}>
                  {(step, idx) => (
                    <div className="step-content-card">
                      <div className="step-title-line">
                        <strong>Action</strong>: <span className={`action-badge action-${step?.action}`}>{step?.action?.toUpperCase()}</span> {step?.point}
                      </div>
                      <div className="step-sub">
                        Stack: [{step?.stack?.join(", ") || ""}]
                      </div>
                    </div>
                  )}
                </StepPlayer>
              )}
            </div>
          </div>
        </div>
      </Status>
    </section>
  );
}
