/**
 * DAG Viewer — interactive force-directed graph visualization.
 * Reads dag-state.json and renders into #dag-viewer container.
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

  // Fetch DAG state
  fetch("../dag-state.json")
    .then((r) => r.json())
    .then((state) => render(state))
    .catch((err) => {
      container.innerHTML =
        '<p style="color:#f85149;padding:1rem;">DAG データの読み込みに失敗しました。</p>';
      console.error("DAG viewer error:", err);
    });

  function render(state) {
    const nodes = Object.values(state.nodes);
    const nodeMap = state.nodes;

    // Build edges
    const edges = [];
    for (const node of nodes) {
      for (const dep of node.dependsOn) {
        if (nodeMap[dep]) {
          edges.push({ from: dep, to: node.id });
        }
      }
    }

    // Layout: layered by type (left to right)
    const typeOrder = ["data_source", "parameter", "analysis", "report", "task"];
    const layers = {};
    for (const t of typeOrder) layers[t] = [];
    for (const node of nodes) {
      (layers[node.type] || []).push(node);
    }

    // Compute positions
    const width = 1200;
    const layerSpacing = width / (typeOrder.length + 1);
    const positions = {};

    for (let li = 0; li < typeOrder.length; li++) {
      const type = typeOrder[li];
      const layerNodes = layers[type] || [];
      const x = layerSpacing * (li + 1);
      const vSpacing = Math.max(30, 600 / (layerNodes.length + 1));
      const totalHeight = layerNodes.length * vSpacing;
      const startY = Math.max(30, (600 - totalHeight) / 2 + vSpacing / 2);

      // Sort nodes within layer by episode tag for consistent ordering
      layerNodes.sort((a, b) => {
        const aTag = (a.tags || []).find((t) => t.startsWith("episode:")) || "";
        const bTag = (b.tags || []).find((t) => t.startsWith("episode:")) || "";
        if (aTag !== bTag) return aTag.localeCompare(bTag);
        return a.id.localeCompare(b.id);
      });

      for (let ni = 0; ni < layerNodes.length; ni++) {
        positions[layerNodes[ni].id] = {
          x: x,
          y: startY + ni * vSpacing,
        };
      }
    }

    const height = Math.max(
      600,
      Math.max(...Object.values(positions).map((p) => p.y)) + 40
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

    for (const node of nodes) {
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
        showTooltip(node, pos);
        highlightConnections(node.id, edges, positions);
      });

      nodeGroup.appendChild(g);
    }
    svg.appendChild(nodeGroup);

    container.innerHTML = "";
    container.appendChild(svg);

    // Add legend
    const legend = document.createElement("div");
    legend.className = "dag-legend";
    for (const [type, color] of Object.entries(TYPE_COLORS)) {
      const item = document.createElement("span");
      item.className = "dag-legend-item";
      item.innerHTML = `<span class="swatch" style="background:${color}"></span>${TYPE_LABELS[type] || type}`;
      legend.appendChild(item);
    }
    // Status legend
    for (const [status, color] of Object.entries(STATUS_COLORS)) {
      const item = document.createElement("span");
      item.className = "dag-legend-item";
      item.innerHTML = `<span class="swatch" style="background:transparent;border:2px solid ${color}"></span>${STATUS_LABELS[status] || status}`;
      legend.appendChild(item);
    }
    container.appendChild(legend);

    // Click on background to dismiss tooltip
    svg.addEventListener("click", () => dismissTooltip());

    // Tooltip element
    let tooltipEl = null;

    function showTooltip(node, pos) {
      dismissTooltip();
      tooltipEl = document.createElement("div");
      tooltipEl.className = "dag-tooltip";

      const statusColor = STATUS_COLORS[node.status] || "#8b949e";
      const typeLabel = TYPE_LABELS[node.type] || node.type;
      const statusLabel = STATUS_LABELS[node.status] || node.status;

      let html = `<h4>${escapeHtml(node.title)}</h4>`;
      html += `<div class="dag-type">${escapeHtml(node.id)} [${typeLabel}]</div>`;
      html += `<div><span class="dag-status" style="background:${statusColor}33;color:${statusColor}">${statusLabel}</span> v${node.version}</div>`;

      if (node.dependsOn && node.dependsOn.length > 0) {
        html += `<div style="margin-top:0.3rem;font-size:0.8em;">依存先: ${node.dependsOn.length}件</div>`;
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
      container.appendChild(tooltipEl);
    }

    function dismissTooltip() {
      if (tooltipEl) {
        tooltipEl.remove();
        tooltipEl = null;
      }
      // Reset edge highlighting
      edgeGroup
        .querySelectorAll("line")
        .forEach((l) => {
          l.setAttribute("stroke-opacity", "0.4");
          l.setAttribute("stroke-width", "1");
          l.setAttribute("stroke", "#484f58");
        });
      nodeGroup
        .querySelectorAll(".dag-node circle")
        .forEach((c) => {
          c.removeAttribute("filter");
        });
    }

    function highlightConnections(nodeId, allEdges, allPositions) {
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
