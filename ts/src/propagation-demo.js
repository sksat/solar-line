/**
 * Interactive Orbit Propagation Demo — browser module.
 *
 * Demonstrates the three WASM integrators:
 *   1. RK4 fixed-step
 *   2. RK45 Dormand-Prince (adaptive)
 *   3. Störmer-Verlet (symplectic)
 *
 * Users can select preset orbital scenarios and compare integrator
 * accuracy (energy drift) and final-state differences.
 */

// --- WASM module ---
let wasm = null;
let wasmReady = false;

async function initWasm() {
  try {
    const mod = await import("../wasm/solar_line_wasm.js");
    if (mod.default) await mod.default();
    wasm = mod;
    wasmReady = true;
    updateEngineBadge("WASM");
    return true;
  } catch (e) {
    console.warn("WASM load failed:", e);
    updateEngineBadge("利用不可");
    return false;
  }
}

function updateEngineBadge(status) {
  const el = document.getElementById("engine-badge");
  if (el) el.textContent = "エンジン: " + status;
}

// --- Preset scenarios ---
// Each has initial position/velocity in heliocentric km + km/s,
// central body mu, and suggested duration.

const AU = 149597870.7; // km
const MU_SUN = 132712440018.0; // km³/s²

const PRESETS = {
  earth_orbit: {
    label: "地球公転軌道（1年）",
    description: "地球軌道を1年間伝播。エネルギー保存の精度を比較します。",
    x: AU, y: 0, z: 0,
    vx: 0, vy: 29.78, vz: 0,
    mu: MU_SUN,
    duration: 365.25 * 86400,
    dt: 3600,
    rtol: 1e-10, atol: 1e-10,
    viewScale: 1.3 * AU,
    refRadius: AU,
    refLabel: "地球軌道",
    orbitPeriod: 365.25 * 86400,
  },
  mars_transfer: {
    label: "火星遷移軌道（ホーマン）",
    description: "地球→火星のホーマン遷移軌道。約259日間。",
    x: AU, y: 0, z: 0,
    vx: 0, vy: 32.73, vz: 0, // Earth v + ~2.95 km/s departure burn
    mu: MU_SUN,
    duration: 259 * 86400,
    dt: 3600,
    rtol: 1e-10, atol: 1e-10,
    viewScale: 1.8 * AU,
    refRadius: AU,
    refLabel: "地球軌道",
    refRadius2: 1.524 * AU,
    refLabel2: "火星軌道",
    orbitPeriod: null,
  },
  jupiter_transfer: {
    label: "木星遷移軌道",
    description: "地球→木星方向の遷移軌道。約2.7年間。",
    x: AU, y: 0, z: 0,
    vx: 0, vy: 38.58, vz: 0, // departure excess ~8.8 km/s
    mu: MU_SUN,
    duration: 2.7 * 365.25 * 86400,
    dt: 3600,
    rtol: 1e-10, atol: 1e-10,
    viewScale: 6.0 * AU,
    refRadius: AU,
    refLabel: "地球軌道",
    refRadius2: 5.203 * AU,
    refLabel2: "木星軌道",
    orbitPeriod: null,
  },
  ep01_scenario: {
    label: "EP01: 火星→ガニメデ付近（太陽中心）",
    description: "EP01の72h brachistochrone相当。太陽中心座標での弾道近似。",
    x: 1.524 * AU, y: 0, z: 0,
    vx: 0, vy: 24.1, vz: 0,
    mu: MU_SUN,
    duration: 72 * 3600,
    dt: 60,
    rtol: 1e-12, atol: 1e-12,
    viewScale: 6.0 * AU,
    refRadius: 1.524 * AU,
    refLabel: "火星軌道",
    refRadius2: 5.203 * AU,
    refLabel2: "木星軌道",
    orbitPeriod: null,
  },
  high_eccentricity: {
    label: "高離心率軌道 (e≈0.9)",
    description: "近日点0.1AU、遠日点1.9AUの高離心率軌道。積分精度への影響を確認。",
    x: 0.1 * AU, y: 0, z: 0,
    vx: 0, vy: 58.0, vz: 0, // high speed at perihelion
    mu: MU_SUN,
    duration: 0.6 * 365.25 * 86400,
    dt: 600,
    rtol: 1e-10, atol: 1e-10,
    viewScale: 2.2 * AU,
    refRadius: AU,
    refLabel: "1 AU",
    orbitPeriod: null,
  },
};

// --- State ---
let currentPreset = "earth_orbit";
let lastResults = null;

// --- SVG Trajectory Visualization ---

function drawTrajectory(svgEl, trajectoryPoints, preset) {
  if (!svgEl) return;

  const w = 500;
  const h = 500;
  const cx = w / 2;
  const cy = h / 2;
  const scale = (w / 2 - 30) / preset.viewScale;

  let svg = "";
  // Background
  svg += '<rect width="' + w + '" height="' + h + '" fill="#0d1117"/>';

  // Reference orbits
  const r1px = preset.refRadius * scale;
  svg += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r1px.toFixed(1) + '" fill="none" stroke="#30363d" stroke-width="1" stroke-dasharray="4 2"/>';
  svg += '<text x="' + (cx + r1px + 4).toFixed(1) + '" y="' + (cy - 4) + '" fill="#484f58" font-size="10">' + preset.refLabel + '</text>';

  if (preset.refRadius2) {
    const r2px = preset.refRadius2 * scale;
    svg += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r2px.toFixed(1) + '" fill="none" stroke="#30363d" stroke-width="1" stroke-dasharray="4 2"/>';
    svg += '<text x="' + (cx + r2px + 4).toFixed(1) + '" y="' + (cy - 4) + '" fill="#484f58" font-size="10">' + preset.refLabel2 + '</text>';
  }

  // Sun
  svg += '<circle cx="' + cx + '" cy="' + cy + '" r="4" fill="#ffdd00"/>';
  svg += '<text x="' + cx + '" y="' + (cy + 16) + '" fill="#ffdd00" font-size="10" text-anchor="middle">太陽</text>';

  // Trajectory path
  if (trajectoryPoints && trajectoryPoints.length >= 8) {
    let pathD = "";
    for (let i = 0; i < trajectoryPoints.length; i += 4) {
      const px = cx + trajectoryPoints[i + 1] * scale;
      const py = cy - trajectoryPoints[i + 2] * scale; // y flipped
      if (i === 0) {
        pathD += "M " + px.toFixed(2) + " " + py.toFixed(2);
      } else {
        pathD += " L " + px.toFixed(2) + " " + py.toFixed(2);
      }
    }
    svg += '<path d="' + pathD + '" fill="none" stroke="#58a6ff" stroke-width="1.5" stroke-opacity="0.8"/>';

    // Start marker
    const sx = cx + trajectoryPoints[1] * scale;
    const sy = cy - trajectoryPoints[2] * scale;
    svg += '<circle cx="' + sx.toFixed(1) + '" cy="' + sy.toFixed(1) + '" r="4" fill="#3fb950"/>';
    svg += '<text x="' + (sx + 8).toFixed(1) + '" y="' + (sy - 4) + '" fill="#3fb950" font-size="10">出発</text>';

    // End marker
    const last = trajectoryPoints.length - 4;
    const ex = cx + trajectoryPoints[last + 1] * scale;
    const ey = cy - trajectoryPoints[last + 2] * scale;
    svg += '<circle cx="' + ex.toFixed(1) + '" cy="' + ey.toFixed(1) + '" r="4" fill="#f85149"/>';
    svg += '<text x="' + (ex + 8).toFixed(1) + '" y="' + (ey - 4) + '" fill="#f85149" font-size="10">到着</text>';
  }

  svgEl.innerHTML = svg;
}

// --- Integrator Comparison ---

function runComparison(preset) {
  if (!wasmReady) return null;

  const { x, y, z, vx, vy, vz, mu, duration, dt, rtol, atol } = preset;

  // Compute sample_interval to keep trajectory manageable (~500 points max)
  const totalSteps = Math.ceil(duration / dt);
  const sampleInterval = Math.max(1, Math.floor(totalSteps / 500));

  const t0 = performance.now();

  // 1. RK4 trajectory (for visualization + final state)
  const trajectory = wasm.propagate_trajectory(x, y, z, vx, vy, vz, mu, dt, duration, sampleInterval);
  const rk4Result = wasm.propagate_ballistic(x, y, z, vx, vy, vz, mu, dt, duration);
  const tRk4 = performance.now();

  // 2. RK45 adaptive
  const rk45Result = wasm.propagate_adaptive_ballistic(x, y, z, vx, vy, vz, mu, duration, rtol, atol);
  const tRk45 = performance.now();

  // 3. Störmer-Verlet symplectic
  const svResult = wasm.propagate_symplectic_ballistic(x, y, z, vx, vy, vz, mu, dt, duration);
  const tSv = performance.now();

  return {
    trajectory: Array.from(trajectory),
    rk4: {
      name: "RK4（固定刻み）",
      pos: [rk4Result[0], rk4Result[1], rk4Result[2]],
      vel: [rk4Result[3], rk4Result[4], rk4Result[5]],
      time: rk4Result[6],
      energyDrift: rk4Result[7],
      nSteps: totalSteps,
      wallMs: tRk4 - t0,
      dt: dt,
    },
    rk45: {
      name: "RK45（適応刻み）",
      pos: [rk45Result[0], rk45Result[1], rk45Result[2]],
      vel: [rk45Result[3], rk45Result[4], rk45Result[5]],
      time: rk45Result[6],
      energyDrift: rk45Result[7],
      nEval: rk45Result[8],
      wallMs: tRk45 - tRk4,
      rtol: rtol,
      atol: atol,
    },
    symplectic: {
      name: "Störmer-Verlet（辰巳型）",
      pos: [svResult[0], svResult[1], svResult[2]],
      vel: [svResult[3], svResult[4], svResult[5]],
      time: svResult[6],
      energyDrift: svResult[7],
      nSteps: svResult[8],
      wallMs: tSv - tRk45,
      dt: dt,
    },
  };
}

// --- Results display ---

function formatSci(n, digits) {
  if (n === 0 || n === undefined || n === null) return "0";
  if (isNaN(n)) return "NaN";
  return n.toExponential(digits || 2);
}

function formatDist(km) {
  if (Math.abs(km) >= AU * 0.01) {
    return (km / AU).toFixed(4) + " AU";
  }
  return km.toFixed(1) + " km";
}

function posDistance(a, b) {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  const dz = a[2] - b[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function renderResults(results) {
  const container = document.getElementById("results-table");
  if (!container) return;

  const integrators = [results.rk4, results.rk45, results.symplectic];

  // Use RK45 as the reference (highest expected accuracy for ballistic)
  const ref = results.rk45;

  let html = '<table class="comparison-table">';
  html += "<thead><tr><th>項目</th>";
  for (const integ of integrators) {
    html += "<th>" + integ.name + "</th>";
  }
  html += "</tr></thead><tbody>";

  // Energy drift
  html += "<tr><td>エネルギードリフト |ΔE/E₀|</td>";
  for (const integ of integrators) {
    const cls = integ.energyDrift < 1e-10 ? "val-good" : integ.energyDrift < 1e-6 ? "val-ok" : "val-bad";
    html += '<td class="' + cls + '">' + formatSci(integ.energyDrift, 2) + "</td>";
  }
  html += "</tr>";

  // Position difference from RK45
  html += "<tr><td>位置差（RK45比）</td>";
  for (const integ of integrators) {
    const dist = posDistance(integ.pos, ref.pos);
    html += "<td>" + formatDist(dist) + "</td>";
  }
  html += "</tr>";

  // Final position
  html += "<tr><td>最終位置 (x)</td>";
  for (const integ of integrators) {
    html += "<td>" + formatSci(integ.pos[0]) + " km</td>";
  }
  html += "</tr>";
  html += "<tr><td>最終位置 (y)</td>";
  for (const integ of integrators) {
    html += "<td>" + formatSci(integ.pos[1]) + " km</td>";
  }
  html += "</tr>";

  // Steps / evaluations
  html += "<tr><td>ステップ数</td>";
  for (const integ of integrators) {
    const n = integ.nSteps || integ.nEval || "-";
    html += "<td>" + (typeof n === "number" ? n.toLocaleString() : n) + "</td>";
  }
  html += "</tr>";

  // Config info
  html += "<tr><td>設定</td>";
  html += "<td>dt=" + (results.rk4.dt || "-") + "s</td>";
  html += "<td>rtol=" + formatSci(results.rk45.rtol) + " atol=" + formatSci(results.rk45.atol) + "</td>";
  html += "<td>dt=" + (results.symplectic.dt || "-") + "s</td>";
  html += "</tr>";

  // Wall time
  html += "<tr><td>計算時間</td>";
  for (const integ of integrators) {
    html += "<td>" + integ.wallMs.toFixed(1) + " ms</td>";
  }
  html += "</tr>";

  html += "</tbody></table>";
  container.innerHTML = html;
}

function renderDescription(preset) {
  const el = document.getElementById("scenario-description");
  if (el) el.textContent = preset.description;
}

// --- Energy drift bar chart ---

function renderDriftChart(results) {
  const container = document.getElementById("drift-chart");
  if (!container) return;

  const integrators = [
    { ...results.rk4, color: "#58a6ff" },
    { ...results.rk45, color: "#3fb950" },
    { ...results.symplectic, color: "#d2a8ff" },
  ];

  const maxDrift = Math.max(...integrators.map(i => i.energyDrift || 1e-30));
  const logMax = Math.ceil(Math.log10(maxDrift + 1e-30));
  const logMin = logMax - 16; // show 16 orders of magnitude

  let html = '<div class="drift-bars">';
  for (const integ of integrators) {
    const logVal = integ.energyDrift > 0 ? Math.log10(integ.energyDrift) : logMin;
    const pct = Math.max(0, Math.min(100, ((logVal - logMin) / (logMax - logMin)) * 100));
    html += '<div class="bar-row">';
    html += '<span class="bar-label">' + integ.name + "</span>";
    html += '<div class="bar-container"><div class="bar-fill" style="width:' + pct.toFixed(1) + "%;background:" + integ.color + '"></div></div>';
    html += '<span class="bar-value">' + formatSci(integ.energyDrift, 1) + "</span>";
    html += "</div>";
  }
  html += "</div>";
  html += '<div class="drift-note">※ バーは対数スケール（左ほど高精度）</div>';
  container.innerHTML = html;
}

// --- Main run ---

function runDemo() {
  const preset = PRESETS[currentPreset];
  if (!preset || !wasmReady) return;

  // Read user overrides from controls
  const dtInput = document.getElementById("ctrl-dt");
  const durInput = document.getElementById("ctrl-duration");
  const rtolInput = document.getElementById("ctrl-rtol");
  const atolInput = document.getElementById("ctrl-atol");

  const overridden = { ...preset };
  if (dtInput) overridden.dt = parseFloat(dtInput.value) || preset.dt;
  if (durInput) overridden.duration = (parseFloat(durInput.value) || (preset.duration / 86400)) * 86400;
  if (rtolInput) overridden.rtol = parseFloat(rtolInput.value) || preset.rtol;
  if (atolInput) overridden.atol = parseFloat(atolInput.value) || preset.atol;

  const statusEl = document.getElementById("run-status");
  if (statusEl) statusEl.textContent = "計算中...";

  // Use requestAnimationFrame to let the UI update before blocking
  requestAnimationFrame(() => {
    try {
      const results = runComparison(overridden);
      if (!results) return;
      lastResults = results;

      drawTrajectory(document.getElementById("trajectory-svg"), results.trajectory, overridden);
      renderResults(results);
      renderDriftChart(results);
      if (statusEl) statusEl.textContent = "完了";
    } catch (e) {
      console.error("Propagation error:", e);
      if (statusEl) statusEl.textContent = "エラー: " + e.message;
    }
  });
}

// --- Initialization ---

function populatePresets() {
  const container = document.getElementById("preset-buttons");
  if (!container) return;

  let html = "";
  for (const [key, preset] of Object.entries(PRESETS)) {
    html += '<button class="preset-btn" data-preset="' + key + '">' + preset.label + "</button>";
  }
  container.innerHTML = html;

  // Bind clicks
  for (const btn of container.querySelectorAll(".preset-btn")) {
    btn.addEventListener("click", () => {
      currentPreset = btn.getAttribute("data-preset");
      // Update active state
      for (const b of container.querySelectorAll(".preset-btn")) {
        b.classList.toggle("active", b === btn);
      }
      // Update controls with preset defaults
      const p = PRESETS[currentPreset];
      setControlValue("ctrl-dt", p.dt);
      setControlValue("ctrl-duration", (p.duration / 86400).toFixed(2));
      setControlValue("ctrl-rtol", p.rtol);
      setControlValue("ctrl-atol", p.atol);
      renderDescription(p);
      runDemo();
    });
  }

  // Set initial active
  const firstBtn = container.querySelector('[data-preset="earth_orbit"]');
  if (firstBtn) firstBtn.classList.add("active");
}

function setControlValue(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value;
}

function initControls() {
  const runBtn = document.getElementById("run-btn");
  if (runBtn) runBtn.addEventListener("click", runDemo);

  // Bind enter key on inputs
  for (const id of ["ctrl-dt", "ctrl-duration", "ctrl-rtol", "ctrl-atol"]) {
    const el = document.getElementById(id);
    if (el) el.addEventListener("keydown", (e) => {
      if (e.key === "Enter") runDemo();
    });
  }
}

async function init() {
  populatePresets();
  initControls();
  renderDescription(PRESETS[currentPreset]);

  // Set initial control values
  const p = PRESETS[currentPreset];
  setControlValue("ctrl-dt", p.dt);
  setControlValue("ctrl-duration", (p.duration / 86400).toFixed(2));
  setControlValue("ctrl-rtol", p.rtol);
  setControlValue("ctrl-atol", p.atol);

  const ok = await initWasm();
  if (ok) {
    runDemo();
  } else {
    const statusEl = document.getElementById("run-status");
    if (statusEl) statusEl.textContent = "WASMの読み込みに失敗しました。wasm-pack buildを実行してください。";
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
