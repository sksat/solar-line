/**
 * DAG Viewer — interactive layered graph visualization with WASM-powered analysis.
 * Uses Rust/WASM for Sugiyama layout, impact analysis, and dependency chain extraction.
 * Falls back to JS layout when WASM is unavailable.
 */
(function () {
  "use strict";

  const container = document.getElementById("dag-viewer");
  if (!container) return;

  // Color palette for node types
  const TYPE_COLORS = {
    data_source: "#58a6ff",
    parameter: "#f0883e",
    analysis: "#3fb950",
    report: "#bc8cff",
    task: "#8b949e",
  };

  const TYPE_LABELS = {
    data_source: "データソース",
    parameter: "パラメータ",
    analysis: "分析",
    report: "レポート",
    task: "タスク",
  };

  const STATUS_COLORS = {
    valid: "#3fb950",
    stale: "#f0883e",
    pending: "#8b949e",
  };

  const STATUS_LABELS = {
    valid: "有効",
    stale: "要再検証",
    pending: "未処理",
  };

  // Episode colors for background grouping
  const EPISODE_COLORS = {
    "episode:01": "#58a6ff15",
    "episode:02": "#3fb95015",
    "episode:03": "#f0883e15",
    "episode:04": "#bc8cff15",
    "episode:05": "#f8514915",
  };

  const EPISODE_LABELS = {
    "episode:01": "EP01",
    "episode:02": "EP02",
    "episode:03": "EP03",
    "episode:04": "EP04",
    "episode:05": "EP05",
  };

  let currentFilter = "all";
  let dagState = null;
  let snapshotManifest = [];
  let wasmModule = null;
  let analysisCache = null; // Cached WASM analysis results

  // --- WASM loader ---
  async function tryLoadWasm() {
    try {
      const mod = await import("../wasm/solar_line_wasm.js");
      if (mod.default) await mod.default();
      wasmModule = mod;
    } catch {
      wasmModule = null;
    }
  }

  // Fetch DAG state, snapshots, and WASM in parallel
  Promise.all([
    fetch("../dag-state.json").then((r) => r.json()),
    fetch("../dag-snapshots/manifest.json").then((r) => r.json()).catch(() => []),
    tryLoadWasm(),
  ])
    .then(([state, manifest]) => {
      dagState = state;
      snapshotManifest = manifest || [];
      analysisCache = runAnalysis(state);
      buildUI(state);
      renderFiltered(state, "all");
    })
    .catch((err) => {
      container.innerHTML =
        '<p style="color:#f85149;padding:1rem;">DAG データの読み込みに失敗しました。</p>';
      console.error("DAG viewer error:", err);
    });

  // --- WASM analysis functions ---

  function runAnalysis(state) {
    if (!wasmModule) return null;
    try {
      return wasmModule.dag_analyze(state);
    } catch (e) {
      console.warn("WASM dag_analyze failed:", e);
      return null;
    }
  }

  function runLayout(state, width, height) {
    if (!wasmModule) return null;
    try {
      return wasmModule.dag_layout(state, width, height);
    } catch (e) {
      console.warn("WASM dag_layout failed:", e);
      return null;
    }
  }

  function runImpact(state, nodeId) {
    if (!wasmModule) return null;
    try {
      return wasmModule.dag_impact(state, nodeId);
    } catch (e) {
      console.warn("WASM dag_impact failed:", e);
      return null;
    }
  }

  function runUpstream(state, nodeId) {
    if (!wasmModule) return null;
    try {
      return wasmModule.dag_upstream(state, nodeId);
    } catch (e) {
      return null;
    }
  }

  function runDownstream(state, nodeId) {
    if (!wasmModule) return null;
    try {
      return wasmModule.dag_downstream(state, nodeId);
    } catch (e) {
      return null;
    }
  }

  // --- Node classification helpers ---

  function getEpisodeTag(node) {
    return (node.tags || []).find((t) => t.startsWith("episode:")) || null;
  }

  function getNodeCategory(node) {
    const ep = getEpisodeTag(node);
    if (ep) return ep;
    if ((node.tags || []).includes("cross-episode")) return "cross";
    if ((node.tags || []).includes("source")) return "cross";
    if ((node.tags || []).includes("summary")) return "summary";
    if ((node.tags || []).includes("meta")) return "summary";
    if (node.type === "parameter") return "cross";
    if (node.type === "task") return "task";
    return "cross";
  }

  function filterNodes(state, filter) {
    const allNodes = Object.values(state.nodes);
    if (filter === "all") return allNodes;
    if (filter === "cross") {
      return allNodes.filter((n) => {
        const cat = getNodeCategory(n);
        return cat === "cross" || cat === "summary";
      });
    }
    if (filter.startsWith("episode:")) {
      const epNodes = allNodes.filter((n) => getEpisodeTag(n) === filter);
      const epIds = new Set(epNodes.map((n) => n.id));
      const deps = new Set();
      for (const n of epNodes) {
        for (const d of n.dependsOn) deps.add(d);
      }
      const epReport = allNodes.find((n) => n.id === "report." + filter.replace("episode:", "ep"));
      return allNodes.filter((n) => {
        if (epIds.has(n.id)) return true;
        if (deps.has(n.id)) return true;
        if (epReport && n.id === epReport.id) return true;
        return false;
      });
    }
    return allNodes;
  }

  // --- Build a filtered sub-state for WASM (only includes visible nodes) ---
  function buildFilteredState(state, visibleNodes) {
    const visibleIds = new Set(visibleNodes.map((n) => n.id));
    const filteredNodes = {};
    for (const node of visibleNodes) {
      filteredNodes[node.id] = {
        ...node,
        dependsOn: node.dependsOn.filter((d) => visibleIds.has(d)),
      };
    }
    return { nodes: filteredNodes, schemaVersion: state.schemaVersion || 1 };
  }

  // --- UI construction ---

  function buildUI(state) {
    const filterBar = document.createElement("div");
    filterBar.className = "dag-filter-bar";

    const filters = [
      { id: "all", label: "全体" },
      { id: "episode:01", label: "EP01" },
      { id: "episode:02", label: "EP02" },
      { id: "episode:03", label: "EP03" },
      { id: "episode:04", label: "EP04" },
      { id: "episode:05", label: "EP05" },
      { id: "cross", label: "横断分析" },
    ];

    const hasTaskNodes = Object.values(state.nodes).some((n) => n.type === "task");
    if (hasTaskNodes) {
      filters.push({ id: "task", label: "開発タスク" });
    }

    for (const f of filters) {
      const btn = document.createElement("button");
      btn.className = "dag-filter-btn" + (f.id === currentFilter ? " active" : "");
      btn.textContent = f.label;
      btn.dataset.filter = f.id;
      btn.addEventListener("click", () => {
        currentFilter = f.id;
        filterBar.querySelectorAll(".dag-filter-btn").forEach((b) =>
          b.classList.toggle("active", b.dataset.filter === f.id)
        );
        renderFiltered(dagState, f.id);
      });
      filterBar.appendChild(btn);
    }

    // Snapshot selector (historical view)
    if (snapshotManifest.length > 0) {
      const sep = document.createElement("span");
      sep.style.cssText = "border-left:1px solid var(--border,#30363d);height:1.2em;margin:0 0.3rem;";
      filterBar.appendChild(sep);

      const snapLabel = document.createElement("span");
      snapLabel.textContent = "履歴:";
      snapLabel.style.cssText = "font-size:0.8em;color:var(--text-secondary,#8b949e);";
      filterBar.appendChild(snapLabel);

      const snapSelect = document.createElement("select");
      snapSelect.className = "dag-snapshot-select";
      const currentOpt = document.createElement("option");
      currentOpt.value = "current";
      currentOpt.textContent = "最新";
      snapSelect.appendChild(currentOpt);
      for (let i = snapshotManifest.length - 1; i >= 0; i--) {
        const snap = snapshotManifest[i];
        const opt = document.createElement("option");
        opt.value = snap.file;
        const d = new Date(snap.timestamp);
        opt.textContent = `${d.toLocaleDateString("ja-JP")} ${d.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })} (${snap.nodes}N/${snap.edges}E)`;
        snapSelect.appendChild(opt);
      }
      snapSelect.addEventListener("change", () => {
        if (snapSelect.value === "current") {
          dagState = null;
          fetch("../dag-state.json")
            .then((r) => r.json())
            .then((state) => {
              dagState = state;
              analysisCache = runAnalysis(state);
              renderFiltered(state, currentFilter);
            });
        } else {
          fetch("../dag-snapshots/" + snapSelect.value)
            .then((r) => r.json())
            .then((state) => {
              dagState = state;
              analysisCache = runAnalysis(state);
              renderFiltered(state, currentFilter);
            });
        }
      });
      filterBar.appendChild(snapSelect);
    }

    // Node count + engine badge
    const countLabel = document.createElement("span");
    countLabel.className = "dag-node-count";
    countLabel.id = "dag-node-count";
    filterBar.appendChild(countLabel);

    const engineBadge = document.createElement("span");
    engineBadge.className = "dag-engine-badge";
    engineBadge.textContent = wasmModule ? "WASM" : "JS";
    engineBadge.style.cssText = "font-size:0.7em;padding:1px 6px;border-radius:4px;background:" +
      (wasmModule ? "#3fb95033;color:#3fb950" : "#f0883e33;color:#f0883e") + ";margin-left:0.5rem;";
    filterBar.appendChild(engineBadge);

    container.innerHTML = "";
    container.appendChild(filterBar);

    const graphContainer = document.createElement("div");
    graphContainer.id = "dag-graph-container";
    container.appendChild(graphContainer);

    // Analysis panel (hidden by default, shown on node click)
    const analysisPanel = document.createElement("div");
    analysisPanel.id = "dag-analysis-panel";
    analysisPanel.style.display = "none";
    container.appendChild(analysisPanel);
  }

  function renderFiltered(state, filter) {
    const graphContainer = document.getElementById("dag-graph-container");
    if (!graphContainer) return;

    const visibleNodes = filterNodes(state, filter);
    const visibleIds = new Set(visibleNodes.map((n) => n.id));
    const nodeMap = state.nodes;

    // Build edges (only between visible nodes)
    const edges = [];
    for (const node of visibleNodes) {
      for (const dep of node.dependsOn) {
        if (visibleIds.has(dep)) {
          edges.push({ from: dep, to: node.id });
        }
      }
    }

    // Update count
    const countEl = document.getElementById("dag-node-count");
    if (countEl) {
      countEl.textContent = `${visibleNodes.length}ノード / ${edges.length}エッジ`;
    }

    const width = 1200;

    // --- WASM or fallback layout ---
    let positions = {};
    let layoutCrossings = null;

    const filteredState = buildFilteredState(state, visibleNodes);
    const wasmLayout = runLayout(filteredState, width, 600);

    if (wasmLayout) {
      // Use WASM Sugiyama layout (depth-based)
      for (let i = 0; i < wasmLayout.ids.length; i++) {
        positions[wasmLayout.ids[i]] = {
          x: wasmLayout.x[i],
          y: wasmLayout.y[i],
        };
      }
      layoutCrossings = wasmLayout.crossings;
    } else {
      // Fallback: type-based layered layout
      positions = fallbackLayout(visibleNodes, width, 600);
    }

    const height = Math.max(
      600,
      Math.max(...Object.values(positions).map((p) => p.y), 0) + 40
    );

    // Build SVG
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", height);
    svg.style.background = "transparent";

    // Defs for arrow markers
    const defs = document.createElementNS(svgNS, "defs");
    const markerNormal = createArrowMarker(svgNS, "dag-arrow", "#484f58");
    const markerHighlight = createArrowMarker(svgNS, "dag-arrow-hl", "#58a6ff");
    const markerImpact = createArrowMarker(svgNS, "dag-arrow-impact", "#f85149");
    defs.appendChild(markerNormal);
    defs.appendChild(markerHighlight);
    defs.appendChild(markerImpact);
    svg.appendChild(defs);

    // Draw episode background regions (in "all" view)
    if (filter === "all") {
      drawEpisodeBackgrounds(svgNS, svg, visibleNodes, positions);
    }

    // Draw edges
    const edgeGroup = document.createElementNS(svgNS, "g");
    edgeGroup.setAttribute("class", "dag-edges");
    for (const edge of edges) {
      const from = positions[edge.from];
      const to = positions[edge.to];
      if (!from || !to) continue;

      const line = document.createElementNS(svgNS, "line");
      line.setAttribute("x1", from.x);
      line.setAttribute("y1", from.y);
      line.setAttribute("x2", to.x);
      line.setAttribute("y2", to.y);
      line.setAttribute("stroke", "#484f58");
      line.setAttribute("stroke-width", "1");
      line.setAttribute("stroke-opacity", "0.4");
      line.setAttribute("marker-end", "url(#dag-arrow)");
      line.dataset.from = edge.from;
      line.dataset.to = edge.to;
      edgeGroup.appendChild(line);
    }
    svg.appendChild(edgeGroup);

    // Draw nodes
    const nodeGroup = document.createElementNS(svgNS, "g");
    nodeGroup.setAttribute("class", "dag-nodes");
    const nodeRadius = 8;

    for (const node of visibleNodes) {
      const pos = positions[node.id];
      if (!pos) continue;

      const g = document.createElementNS(svgNS, "g");
      g.setAttribute("class", "dag-node");
      g.setAttribute("transform", `translate(${pos.x}, ${pos.y})`);
      g.dataset.nodeId = node.id;

      const circle = document.createElementNS(svgNS, "circle");
      circle.setAttribute("r", nodeRadius);
      circle.setAttribute("fill", TYPE_COLORS[node.type] || "#8b949e");
      circle.setAttribute("stroke", STATUS_COLORS[node.status] || "#8b949e");
      circle.setAttribute("stroke-width", "2");
      g.appendChild(circle);

      // Label (abbreviated)
      const label = document.createElementNS(svgNS, "text");
      label.setAttribute("x", nodeRadius + 4);
      label.setAttribute("y", 4);
      label.setAttribute("font-size", "9");
      label.setAttribute("fill", "#c9d1d9");
      label.setAttribute("font-family", "SFMono-Regular, Consolas, monospace");
      label.textContent = abbreviateId(node.id);
      g.appendChild(label);

      // Click handler — enhanced with WASM analysis
      g.addEventListener("click", (e) => {
        e.stopPropagation();
        showTooltip(node, pos, svg, edgeGroup, nodeGroup, edges, width, height, nodeMap, visibleIds, filteredState);
        highlightDependencyChain(node.id, edges, edgeGroup, nodeGroup, visibleIds, filteredState);
      });

      nodeGroup.appendChild(g);
    }
    svg.appendChild(nodeGroup);

    graphContainer.innerHTML = "";
    graphContainer.appendChild(svg);

    // Add legend with crossing count
    const legend = document.createElement("div");
    legend.className = "dag-legend";

    const visibleTypes = new Set(visibleNodes.map((n) => n.type));
    for (const [type, color] of Object.entries(TYPE_COLORS)) {
      if (!visibleTypes.has(type)) continue;
      const item = document.createElement("span");
      item.className = "dag-legend-item";
      item.innerHTML = `<span class="swatch" style="background:${color}"></span>${TYPE_LABELS[type] || type}`;
      legend.appendChild(item);
    }
    const visibleStatuses = new Set(visibleNodes.map((n) => n.status));
    for (const [status, color] of Object.entries(STATUS_COLORS)) {
      if (!visibleStatuses.has(status)) continue;
      const item = document.createElement("span");
      item.className = "dag-legend-item";
      item.innerHTML = `<span class="swatch" style="background:transparent;border:2px solid ${color}"></span>${STATUS_LABELS[status] || status}`;
      legend.appendChild(item);
    }
    if (layoutCrossings !== null) {
      const crossInfo = document.createElement("span");
      crossInfo.className = "dag-legend-item";
      crossInfo.style.opacity = "0.6";
      crossInfo.textContent = `交差: ${layoutCrossings}`;
      legend.appendChild(crossInfo);
    }
    graphContainer.appendChild(legend);

    // Click on background to dismiss
    svg.addEventListener("click", () => {
      dismissTooltip(graphContainer, edgeGroup, nodeGroup);
      hideAnalysisPanel();
    });
  }

  // --- Arrow marker factory ---
  function createArrowMarker(svgNS, id, color) {
    const marker = document.createElementNS(svgNS, "marker");
    marker.setAttribute("id", id);
    marker.setAttribute("viewBox", "0 0 10 6");
    marker.setAttribute("refX", "10");
    marker.setAttribute("refY", "3");
    marker.setAttribute("markerWidth", "8");
    marker.setAttribute("markerHeight", "6");
    marker.setAttribute("orient", "auto-start-reverse");
    const markerPath = document.createElementNS(svgNS, "path");
    markerPath.setAttribute("d", "M 0 0 L 10 3 L 0 6 z");
    markerPath.setAttribute("fill", color);
    marker.appendChild(markerPath);
    return marker;
  }

  // --- Episode background regions ---
  function drawEpisodeBackgrounds(svgNS, svg, visibleNodes, positions) {
    const episodeOrder = ["episode:01", "episode:02", "episode:03", "episode:04", "episode:05"];
    const bgGroup = document.createElementNS(svgNS, "g");
    bgGroup.setAttribute("class", "dag-episode-backgrounds");

    for (const epTag of episodeOrder) {
      const epNodes = visibleNodes.filter((n) => getEpisodeTag(n) === epTag);
      if (epNodes.length === 0) continue;

      const epPositions = epNodes.map((n) => positions[n.id]).filter(Boolean);
      if (epPositions.length === 0) continue;

      const minX = Math.min(...epPositions.map((p) => p.x)) - 50;
      const maxX = Math.max(...epPositions.map((p) => p.x)) + 80;
      const minY = Math.min(...epPositions.map((p) => p.y)) - 16;
      const maxY = Math.max(...epPositions.map((p) => p.y)) + 16;

      const rect = document.createElementNS(svgNS, "rect");
      rect.setAttribute("x", minX);
      rect.setAttribute("y", minY);
      rect.setAttribute("width", maxX - minX);
      rect.setAttribute("height", maxY - minY);
      rect.setAttribute("rx", "6");
      rect.setAttribute("fill", EPISODE_COLORS[epTag] || "transparent");
      rect.setAttribute("stroke", (EPISODE_COLORS[epTag] || "#ffffff15").replace("15", "30"));
      rect.setAttribute("stroke-width", "1");
      bgGroup.appendChild(rect);

      const lbl = document.createElementNS(svgNS, "text");
      lbl.setAttribute("x", minX + 4);
      lbl.setAttribute("y", minY + 12);
      lbl.setAttribute("font-size", "10");
      lbl.setAttribute("fill", "#8b949e");
      lbl.setAttribute("font-family", "SFMono-Regular, Consolas, monospace");
      lbl.setAttribute("opacity", "0.7");
      lbl.textContent = EPISODE_LABELS[epTag] || epTag;
      bgGroup.appendChild(lbl);
    }
    svg.appendChild(bgGroup);
  }

  // --- Enhanced tooltip with WASM analysis ---
  function showTooltip(node, pos, svg, edgeGroup, nodeGroup, edges, width, height, nodeMap, visibleIds, filteredState) {
    const graphContainer = document.getElementById("dag-graph-container");
    dismissTooltip(graphContainer, edgeGroup, nodeGroup);

    const tooltipEl = document.createElement("div");
    tooltipEl.className = "dag-tooltip";

    const statusColor = STATUS_COLORS[node.status] || "#8b949e";
    const typeLabel = TYPE_LABELS[node.type] || node.type;
    const statusLabel = STATUS_LABELS[node.status] || node.status;

    let html = `<h4>${escapeHtml(node.title)}</h4>`;
    html += `<div class="dag-type">${escapeHtml(node.id)} [${typeLabel}]</div>`;
    html += `<div><span class="dag-status" style="background:${statusColor}33;color:${statusColor}">${statusLabel}</span> v${node.version}</div>`;

    if (node.dependsOn && node.dependsOn.length > 0) {
      const visibleDeps = node.dependsOn.filter((d) => visibleIds.has(d)).length;
      const totalDeps = node.dependsOn.length;
      html += `<div style="margin-top:0.3rem;font-size:0.8em;">依存先: ${visibleDeps === totalDeps ? totalDeps : visibleDeps + "/" + totalDeps}件</div>`;
    }

    // Use WASM for impact analysis
    const impact = runImpact(dagState, node.id);
    if (impact) {
      html += `<div style="font-size:0.8em;color:#f85149;">影響先: ${impact.cascade_count}件`;
      if (impact.cascade_count > 0) {
        const parts = [];
        if (impact.by_type.analysis > 0) parts.push(`分析${impact.by_type.analysis}`);
        if (impact.by_type.report > 0) parts.push(`レポート${impact.by_type.report}`);
        if (impact.by_type.parameter > 0) parts.push(`パラメータ${impact.by_type.parameter}`);
        if (impact.by_type.data_source > 0) parts.push(`データ${impact.by_type.data_source}`);
        html += ` (${parts.join(", ")})`;
      }
      html += `</div>`;
    } else {
      // Fallback: JS downstream count
      const downstream = countDownstream(node.id, nodeMap);
      if (downstream > 0) {
        html += `<div style="font-size:0.8em;">影響先: ${downstream}件</div>`;
      }
    }

    // Depth from analysis cache
    if (analysisCache) {
      const depthInfo = analysisCache.depths.find((d) => d.id === node.id);
      if (depthInfo) {
        html += `<div style="font-size:0.8em;opacity:0.7;">依存深度: ${depthInfo.depth}</div>`;
      }
      // Show if on critical path
      if (analysisCache.critical_path.includes(node.id)) {
        html += `<div style="font-size:0.75em;color:#f0883e;margin-top:0.2rem;">クリティカルパス上</div>`;
      }
    }

    if (node.tags && node.tags.length > 0) {
      html += `<div style="margin-top:0.3rem;font-size:0.75em;opacity:0.7">${node.tags.map(escapeHtml).join(", ")}</div>`;
    }

    if (node.notes) {
      html += `<div style="margin-top:0.3rem;font-size:0.8em;font-style:italic;">${escapeHtml(node.notes)}</div>`;
    }

    if (node.lastValidated) {
      const d = new Date(node.lastValidated);
      html += `<div style="font-size:0.75em;opacity:0.6;margin-top:0.2rem;">最終検証: ${d.toLocaleDateString("ja-JP")}</div>`;
    }

    // WASM analysis buttons
    if (wasmModule) {
      html += `<div style="margin-top:0.5rem;display:flex;gap:4px;flex-wrap:wrap;">`;
      html += `<button class="dag-analysis-btn" data-action="impact" data-node="${escapeHtml(node.id)}" style="font-size:0.7em;padding:2px 8px;cursor:pointer;border:1px solid #f8514966;background:#f8514922;color:#f85149;border-radius:3px;">影響分析</button>`;
      html += `<button class="dag-analysis-btn" data-action="upstream" data-node="${escapeHtml(node.id)}" style="font-size:0.7em;padding:2px 8px;cursor:pointer;border:1px solid #58a6ff66;background:#58a6ff22;color:#58a6ff;border-radius:3px;">上流を表示</button>`;
      html += `<button class="dag-analysis-btn" data-action="downstream" data-node="${escapeHtml(node.id)}" style="font-size:0.7em;padding:2px 8px;cursor:pointer;border:1px solid #3fb95066;background:#3fb95022;color:#3fb950;border-radius:3px;">下流を表示</button>`;
      html += `</div>`;
    }

    tooltipEl.innerHTML = html;

    // Attach analysis button handlers
    setTimeout(() => {
      tooltipEl.querySelectorAll(".dag-analysis-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const action = btn.dataset.action;
          const nodeId = btn.dataset.node;
          showAnalysisPanel(action, nodeId, edgeGroup, nodeGroup, visibleIds);
        });
      });
    }, 0);

    // Position tooltip
    const containerRect = container.getBoundingClientRect();
    const svgRect = svg.getBoundingClientRect();
    const scaleX = svgRect.width / width;
    const scaleY = svgRect.height / height;
    let left = pos.x * scaleX + svgRect.left - containerRect.left + 20;
    let top = pos.y * scaleY + svgRect.top - containerRect.top - 10;

    if (left + 350 > containerRect.width) {
      left = pos.x * scaleX + svgRect.left - containerRect.left - 370;
    }
    if (top < 0) top = 10;

    tooltipEl.style.left = left + "px";
    tooltipEl.style.top = top + "px";
    graphContainer.appendChild(tooltipEl);
  }

  // --- Analysis panel (below graph) ---
  function showAnalysisPanel(action, nodeId, edgeGroup, nodeGroup, visibleIds) {
    const panel = document.getElementById("dag-analysis-panel");
    if (!panel) return;

    let html = "";
    if (action === "impact") {
      const impact = runImpact(dagState, nodeId);
      if (impact) {
        html = `<h4 style="margin:0 0 0.5rem;">影響分析: ${escapeHtml(nodeId)}</h4>`;
        html += `<p>このノードを無効化すると <strong>${impact.cascade_count}件</strong> のノードに影響が波及します。</p>`;
        if (impact.affected.length > 0) {
          html += `<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:0.3rem;">`;
          for (const id of impact.affected) {
            const n = dagState.nodes[id];
            const color = n ? TYPE_COLORS[n.type] || "#8b949e" : "#8b949e";
            html += `<span style="font-size:0.75em;padding:1px 6px;border-radius:3px;background:${color}22;color:${color};border:1px solid ${color}44;">${escapeHtml(id)}</span>`;
          }
          html += `</div>`;
        }
        // Highlight affected nodes
        highlightNodeSet(new Set(impact.affected), nodeId, edgeGroup, nodeGroup, "#f85149", "url(#dag-arrow-impact)");
      }
    } else if (action === "upstream") {
      const upstream = runUpstream(dagState, nodeId);
      if (upstream) {
        html = `<h4 style="margin:0 0 0.5rem;">上流依存: ${escapeHtml(nodeId)}</h4>`;
        html += `<p>このノードは <strong>${upstream.length}件</strong> のノードに（間接的に）依存しています。</p>`;
        if (upstream.length > 0) {
          html += `<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:0.3rem;">`;
          for (const id of upstream) {
            const n = dagState.nodes[id];
            const color = n ? TYPE_COLORS[n.type] || "#8b949e" : "#8b949e";
            html += `<span style="font-size:0.75em;padding:1px 6px;border-radius:3px;background:${color}22;color:${color};border:1px solid ${color}44;">${escapeHtml(id)}</span>`;
          }
          html += `</div>`;
        }
        highlightNodeSet(new Set(upstream), nodeId, edgeGroup, nodeGroup, "#58a6ff", "url(#dag-arrow-hl)");
      }
    } else if (action === "downstream") {
      const downstream = runDownstream(dagState, nodeId);
      if (downstream) {
        html = `<h4 style="margin:0 0 0.5rem;">下流影響: ${escapeHtml(nodeId)}</h4>`;
        html += `<p>このノードの変更は <strong>${downstream.length}件</strong> のノードに伝播します。</p>`;
        if (downstream.length > 0) {
          html += `<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:0.3rem;">`;
          for (const id of downstream) {
            const n = dagState.nodes[id];
            const color = n ? TYPE_COLORS[n.type] || "#8b949e" : "#8b949e";
            html += `<span style="font-size:0.75em;padding:1px 6px;border-radius:3px;background:${color}22;color:${color};border:1px solid ${color}44;">${escapeHtml(id)}</span>`;
          }
          html += `</div>`;
        }
        highlightNodeSet(new Set(downstream), nodeId, edgeGroup, nodeGroup, "#3fb950", "url(#dag-arrow-hl)");
      }
    }

    panel.innerHTML = html;
    panel.style.display = html ? "block" : "none";
    panel.style.cssText += "padding:1rem;margin-top:0.5rem;background:var(--bg-secondary,#161b22);border:1px solid var(--border,#30363d);border-radius:6px;";
  }

  function hideAnalysisPanel() {
    const panel = document.getElementById("dag-analysis-panel");
    if (panel) panel.style.display = "none";
  }

  // --- Highlighting ---

  /** Highlight a set of nodes + edges connecting them to the selected node. */
  function highlightNodeSet(nodeSet, sourceId, edgeGroup, nodeGroup, color, markerUrl) {
    const connectedSet = new Set([...nodeSet, sourceId]);

    edgeGroup.querySelectorAll("line").forEach((l) => {
      const from = l.dataset.from;
      const to = l.dataset.to;
      if (connectedSet.has(from) && connectedSet.has(to)) {
        l.setAttribute("stroke-opacity", "0.8");
        l.setAttribute("stroke-width", "2");
        l.setAttribute("stroke", color);
        l.setAttribute("marker-end", markerUrl);
      } else {
        l.setAttribute("stroke-opacity", "0.1");
        l.setAttribute("stroke-width", "1");
      }
    });

    nodeGroup.querySelectorAll(".dag-node").forEach((g) => {
      const nid = g.dataset.nodeId;
      if (connectedSet.has(nid)) {
        g.querySelector("circle").setAttribute("opacity", "1");
        const text = g.querySelector("text");
        if (text) text.setAttribute("opacity", "1");
      } else {
        g.querySelector("circle").setAttribute("opacity", "0.2");
        const text = g.querySelector("text");
        if (text) text.setAttribute("opacity", "0.2");
      }
    });
  }

  /** Highlight direct + transitive dependency connections. */
  function highlightDependencyChain(nodeId, allEdges, edgeGroup, nodeGroup, visibleIds, filteredState) {
    let upstreamIds = null;
    let downstreamIds = null;
    if (wasmModule && filteredState) {
      try {
        upstreamIds = new Set(wasmModule.dag_upstream(filteredState, nodeId) || []);
        downstreamIds = new Set(wasmModule.dag_downstream(filteredState, nodeId) || []);
      } catch {
        // Fall back
      }
    }

    const connectedEdges = allEdges.filter(
      (e) => e.from === nodeId || e.to === nodeId
    );
    const directlyConnected = new Set(
      connectedEdges.flatMap((e) => [e.from, e.to])
    );

    const allConnected = new Set([...directlyConnected]);
    if (upstreamIds) upstreamIds.forEach((id) => allConnected.add(id));
    if (downstreamIds) downstreamIds.forEach((id) => allConnected.add(id));

    edgeGroup.querySelectorAll("line").forEach((l) => {
      const from = l.dataset.from;
      const to = l.dataset.to;
      if (from === nodeId || to === nodeId) {
        l.setAttribute("stroke-opacity", "1");
        l.setAttribute("stroke-width", "2");
        l.setAttribute("stroke", "#58a6ff");
        l.setAttribute("marker-end", "url(#dag-arrow-hl)");
      } else if (allConnected.has(from) && allConnected.has(to)) {
        l.setAttribute("stroke-opacity", "0.5");
        l.setAttribute("stroke-width", "1.5");
        l.setAttribute("stroke", "#58a6ff88");
        l.setAttribute("marker-end", "url(#dag-arrow-hl)");
      } else {
        l.setAttribute("stroke-opacity", "0.1");
      }
    });

    nodeGroup.querySelectorAll(".dag-node").forEach((g) => {
      const nid = g.dataset.nodeId;
      if (nid === nodeId) {
        g.querySelector("circle").setAttribute("opacity", "1");
      } else if (directlyConnected.has(nid)) {
        g.querySelector("circle").setAttribute("opacity", "1");
        const text = g.querySelector("text");
        if (text) text.setAttribute("opacity", "1");
      } else if (allConnected.has(nid)) {
        g.querySelector("circle").setAttribute("opacity", "0.6");
        const text = g.querySelector("text");
        if (text) text.setAttribute("opacity", "0.6");
      } else {
        g.querySelector("circle").setAttribute("opacity", "0.2");
        const text = g.querySelector("text");
        if (text) text.setAttribute("opacity", "0.2");
      }
    });
  }

  function dismissTooltip(graphContainer, edgeGroup, nodeGroup) {
    if (!graphContainer) graphContainer = document.getElementById("dag-graph-container");
    if (!graphContainer) return;

    const existing = graphContainer.querySelector(".dag-tooltip");
    if (existing) existing.remove();

    if (edgeGroup) {
      edgeGroup.querySelectorAll("line").forEach((l) => {
        l.setAttribute("stroke-opacity", "0.4");
        l.setAttribute("stroke-width", "1");
        l.setAttribute("stroke", "#484f58");
        l.setAttribute("marker-end", "url(#dag-arrow)");
      });
    }
    if (nodeGroup) {
      nodeGroup.querySelectorAll(".dag-node").forEach((g) => {
        g.querySelector("circle").setAttribute("opacity", "1");
        const text = g.querySelector("text");
        if (text) text.setAttribute("opacity", "1");
      });
    }
  }

  // --- Fallback JS layout (type-based, original algorithm) ---
  function fallbackLayout(visibleNodes, width, baseHeight) {
    const typeOrder = ["data_source", "parameter", "analysis", "report", "task"];
    const layers = {};
    for (const t of typeOrder) layers[t] = [];
    for (const node of visibleNodes) {
      if (layers[node.type]) layers[node.type].push(node);
    }

    const positions = {};
    const activeLayers = typeOrder.filter((t) => (layers[t] || []).length > 0);
    const layerSpacing = width / (activeLayers.length + 1);
    const episodeOrder = ["episode:01", "episode:02", "episode:03", "episode:04", "episode:05"];

    for (let li = 0; li < activeLayers.length; li++) {
      const type = activeLayers[li];
      const layerNodes = layers[type] || [];
      const x = layerSpacing * (li + 1);

      layerNodes.sort((a, b) => {
        const aEp = getEpisodeTag(a);
        const bEp = getEpisodeTag(b);
        const aIdx = aEp ? episodeOrder.indexOf(aEp) : 99;
        const bIdx = bEp ? episodeOrder.indexOf(bEp) : 99;
        if (aIdx !== bIdx) return aIdx - bIdx;
        return a.id.localeCompare(b.id);
      });

      const vSpacing = Math.max(28, baseHeight / (layerNodes.length + 1));
      const totalHeight = layerNodes.length * vSpacing;
      const startY = Math.max(30, (baseHeight - totalHeight) / 2 + vSpacing / 2);

      for (let ni = 0; ni < layerNodes.length; ni++) {
        positions[layerNodes[ni].id] = {
          x: x,
          y: startY + ni * vSpacing,
        };
      }
    }
    return positions;
  }

  // --- Utility ---

  function countDownstream(nodeId, nodeMap) {
    const visited = new Set();
    const queue = [nodeId];
    while (queue.length > 0) {
      const current = queue.shift();
      for (const [id, n] of Object.entries(nodeMap)) {
        if (n.dependsOn.includes(current) && !visited.has(id)) {
          visited.add(id);
          queue.push(id);
        }
      }
    }
    return visited.size;
  }

  function abbreviateId(id) {
    return id
      .replace(/^analysis\./, "")
      .replace(/^src\./, "")
      .replace(/^param\./, "")
      .replace(/^report\./, "");
  }

  function escapeHtml(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
})();
