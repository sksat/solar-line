/**
 * DAG Viewer — interactive layered graph visualization with filtering.
 * Reads dag-state.json and renders into #dag-viewer container.
 * Supports view modes: 全体 (all), エピソード別 (by episode), 横断分析 (cross-cutting).
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

  // Fetch DAG state and snapshot manifest in parallel
  Promise.all([
    fetch("../dag-state.json").then((r) => r.json()),
    fetch("../dag-snapshots/manifest.json").then((r) => r.json()).catch(() => []),
  ])
    .then(([state, manifest]) => {
      dagState = state;
      snapshotManifest = manifest || [];
      buildUI(state);
      renderFiltered(state, "all");
    })
    .catch((err) => {
      container.innerHTML =
        '<p style="color:#f85149;padding:1rem;">DAG データの読み込みに失敗しました。</p>';
      console.error("DAG viewer error:", err);
    });

  function getEpisodeTag(node) {
    return (node.tags || []).find((t) => t.startsWith("episode:")) || null;
  }

  function getNodeCategory(node) {
    const ep = getEpisodeTag(node);
    if (ep) return ep;
    if ((node.tags || []).includes("cross-episode")) return "cross";
    if ((node.tags || []).includes("source")) return "cross";
    if ((node.tags || []).includes("summary")) return "summary";
    if ((node.tags || []).includes("summary") || (node.tags || []).includes("meta")) return "summary";
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
      // Include episode nodes + shared params + cross-episode that connect to them
      const epNodes = allNodes.filter((n) => getEpisodeTag(n) === filter);
      const epIds = new Set(epNodes.map((n) => n.id));
      // Also include params/cross-episode nodes that these depend on
      const deps = new Set();
      for (const n of epNodes) {
        for (const d of n.dependsOn) deps.add(d);
      }
      // And reports that depend on episode analyses
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

  function buildUI(state) {
    // Build filter bar
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

    // Only add task filter if there are task nodes
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
      // Current state option
      const currentOpt = document.createElement("option");
      currentOpt.value = "current";
      currentOpt.textContent = "最新";
      snapSelect.appendChild(currentOpt);
      // Historical snapshots (newest first)
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
              renderFiltered(state, currentFilter);
            });
        } else {
          fetch("../dag-snapshots/" + snapSelect.value)
            .then((r) => r.json())
            .then((state) => {
              dagState = state;
              renderFiltered(state, currentFilter);
            });
        }
      });
      filterBar.appendChild(snapSelect);
    }

    // Node count
    const countLabel = document.createElement("span");
    countLabel.className = "dag-node-count";
    countLabel.id = "dag-node-count";
    filterBar.appendChild(countLabel);

    container.innerHTML = "";
    container.appendChild(filterBar);

    // Graph container
    const graphContainer = document.createElement("div");
    graphContainer.id = "dag-graph-container";
    container.appendChild(graphContainer);
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

    // Layout: layered by type (left to right), grouped by episode
    const typeOrder = ["data_source", "parameter", "analysis", "report", "task"];
    const layers = {};
    for (const t of typeOrder) layers[t] = [];
    for (const node of visibleNodes) {
      if (layers[node.type]) layers[node.type].push(node);
    }

    // Compute positions
    const width = 1200;
    const activeLayers = typeOrder.filter((t) => (layers[t] || []).length > 0);
    const layerSpacing = width / (activeLayers.length + 1);
    const positions = {};

    // Episode grouping: sort within each layer by episode, then by id
    const episodeOrder = ["episode:01", "episode:02", "episode:03", "episode:04", "episode:05"];

    for (let li = 0; li < activeLayers.length; li++) {
      const type = activeLayers[li];
      const layerNodes = layers[type] || [];
      const x = layerSpacing * (li + 1);

      // Sort: by episode tag, then cross-episode, then by id
      layerNodes.sort((a, b) => {
        const aEp = getEpisodeTag(a);
        const bEp = getEpisodeTag(b);
        const aIdx = aEp ? episodeOrder.indexOf(aEp) : 99;
        const bIdx = bEp ? episodeOrder.indexOf(bEp) : 99;
        if (aIdx !== bIdx) return aIdx - bIdx;
        return a.id.localeCompare(b.id);
      });

      const vSpacing = Math.max(28, 600 / (layerNodes.length + 1));
      const totalHeight = layerNodes.length * vSpacing;
      const startY = Math.max(30, (600 - totalHeight) / 2 + vSpacing / 2);

      for (let ni = 0; ni < layerNodes.length; ni++) {
        positions[layerNodes[ni].id] = {
          x: x,
          y: startY + ni * vSpacing,
        };
      }
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
    const marker = document.createElementNS(svgNS, "marker");
    marker.setAttribute("id", "dag-arrow");
    marker.setAttribute("viewBox", "0 0 10 6");
    marker.setAttribute("refX", "10");
    marker.setAttribute("refY", "3");
    marker.setAttribute("markerWidth", "8");
    marker.setAttribute("markerHeight", "6");
    marker.setAttribute("orient", "auto-start-reverse");
    const markerPath = document.createElementNS(svgNS, "path");
    markerPath.setAttribute("d", "M 0 0 L 10 3 L 0 6 z");
    markerPath.setAttribute("fill", "#484f58");
    marker.appendChild(markerPath);
    defs.appendChild(marker);
    svg.appendChild(defs);

    // Draw episode background regions (in "all" view)
    if (filter === "all") {
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

        // Episode label
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

      // Click handler
      g.addEventListener("click", (e) => {
        e.stopPropagation();
        showTooltip(node, pos, svg, edgeGroup, nodeGroup, edges, width, height, nodeMap, visibleIds);
        highlightConnections(node.id, edges, edgeGroup, nodeGroup, visibleIds);
      });

      nodeGroup.appendChild(g);
    }
    svg.appendChild(nodeGroup);

    graphContainer.innerHTML = "";
    graphContainer.appendChild(svg);

    // Add legend
    const legend = document.createElement("div");
    legend.className = "dag-legend";

    // Type legend (only types present in current view)
    const visibleTypes = new Set(visibleNodes.map((n) => n.type));
    for (const [type, color] of Object.entries(TYPE_COLORS)) {
      if (!visibleTypes.has(type)) continue;
      const item = document.createElement("span");
      item.className = "dag-legend-item";
      item.innerHTML = `<span class="swatch" style="background:${color}"></span>${TYPE_LABELS[type] || type}`;
      legend.appendChild(item);
    }
    // Status legend
    const visibleStatuses = new Set(visibleNodes.map((n) => n.status));
    for (const [status, color] of Object.entries(STATUS_COLORS)) {
      if (!visibleStatuses.has(status)) continue;
      const item = document.createElement("span");
      item.className = "dag-legend-item";
      item.innerHTML = `<span class="swatch" style="background:transparent;border:2px solid ${color}"></span>${STATUS_LABELS[status] || status}`;
      legend.appendChild(item);
    }
    graphContainer.appendChild(legend);

    // Click on background to dismiss tooltip
    svg.addEventListener("click", () => {
      dismissTooltip(graphContainer, edgeGroup, nodeGroup);
    });
  }

  function showTooltip(node, pos, svg, edgeGroup, nodeGroup, edges, width, height, nodeMap, visibleIds) {
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

    // Count downstream
    const downstream = countDownstream(node.id, nodeMap);
    if (downstream > 0) {
      html += `<div style="font-size:0.8em;">影響先: ${downstream}件</div>`;
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

    tooltipEl.innerHTML = html;

    // Position tooltip
    const containerRect = container.getBoundingClientRect();
    const svgRect = svg.getBoundingClientRect();
    const scaleX = svgRect.width / width;
    const scaleY = svgRect.height / height;
    let left = pos.x * scaleX + svgRect.left - containerRect.left + 20;
    let top = pos.y * scaleY + svgRect.top - containerRect.top - 10;

    // Keep within container
    if (left + 350 > containerRect.width) {
      left = pos.x * scaleX + svgRect.left - containerRect.left - 370;
    }
    if (top < 0) top = 10;

    tooltipEl.style.left = left + "px";
    tooltipEl.style.top = top + "px";
    graphContainer.appendChild(tooltipEl);
  }

  function dismissTooltip(graphContainer, edgeGroup, nodeGroup) {
    if (!graphContainer) graphContainer = document.getElementById("dag-graph-container");
    if (!graphContainer) return;

    const existing = graphContainer.querySelector(".dag-tooltip");
    if (existing) existing.remove();

    // Reset edge highlighting
    if (edgeGroup) {
      edgeGroup.querySelectorAll("line").forEach((l) => {
        l.setAttribute("stroke-opacity", "0.4");
        l.setAttribute("stroke-width", "1");
        l.setAttribute("stroke", "#484f58");
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

  function highlightConnections(nodeId, allEdges, edgeGroup, nodeGroup, visibleIds) {
    // Find connected edges
    const connectedEdges = allEdges.filter(
      (e) => e.from === nodeId || e.to === nodeId
    );
    const connectedIds = new Set(
      connectedEdges.flatMap((e) => [e.from, e.to])
    );

    // Highlight connected edges
    edgeGroup.querySelectorAll("line").forEach((l) => {
      if (l.dataset.from === nodeId || l.dataset.to === nodeId) {
        l.setAttribute("stroke-opacity", "1");
        l.setAttribute("stroke-width", "2");
        l.setAttribute("stroke", "#58a6ff");
      } else {
        l.setAttribute("stroke-opacity", "0.15");
      }
    });

    // Dim non-connected nodes
    nodeGroup.querySelectorAll(".dag-node").forEach((g) => {
      const nid = g.dataset.nodeId;
      if (nid !== nodeId && !connectedIds.has(nid)) {
        g.querySelector("circle").setAttribute("opacity", "0.3");
        const text = g.querySelector("text");
        if (text) text.setAttribute("opacity", "0.3");
      } else {
        g.querySelector("circle").setAttribute("opacity", "1");
        const text = g.querySelector("text");
        if (text) text.setAttribute("opacity", "1");
      }
    });
  }

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
    // Shorten IDs for display: "analysis.ep01.t01" → "ep01.t01"
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
