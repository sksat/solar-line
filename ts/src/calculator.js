/**
 * Interactive Brachistochrone Calculator — browser module.
 *
 * Loaded on episode pages to let users explore transfer parameters.
 * Uses WASM if available, falls back to pure JS.
 *
 * Assumptions (displayed to user):
 * - Straight-line path, accelerate-flip-decelerate at midpoint
 * - Constant thrust, no fuel depletion
 * - Ignores solar/planetary gravity
 * - Rest-to-rest transfer (zero relative velocity)
 */

// --- Pure JS fallback functions ---

function jsBrachistochroneAccel(distanceKm, timeSec) {
  return (4 * distanceKm) / (timeSec * timeSec);
}

function jsBrachistochroneDv(distanceKm, timeSec) {
  return (4 * distanceKm) / timeSec;
}

function jsBrachistochroneMaxDistance(accelKmS2, timeSec) {
  return accelKmS2 * timeSec * timeSec / 4;
}

// --- WASM loader ---

let wasmModule = null;
let useWasm = false;

async function tryLoadWasm() {
  try {
    const mod = await import("../wasm/solar_line_wasm.js");
    if (mod.default) await mod.default();
    wasmModule = mod;
    useWasm = true;
    const badge = document.getElementById("calc-engine-badge");
    if (badge) badge.textContent = "Engine: WASM";
  } catch {
    useWasm = false;
    const badge = document.getElementById("calc-engine-badge");
    if (badge) badge.textContent = "Engine: JS (WASM unavailable)";
  }
}

// --- Calculator API (WASM-first, JS fallback) ---

function calcAccel(distanceKm, timeSec) {
  if (useWasm && wasmModule) {
    return wasmModule.brachistochrone_accel(distanceKm, timeSec);
  }
  return jsBrachistochroneAccel(distanceKm, timeSec);
}

function calcDv(distanceKm, timeSec) {
  if (useWasm && wasmModule) {
    return wasmModule.brachistochrone_dv(distanceKm, timeSec);
  }
  return jsBrachistochroneDv(distanceKm, timeSec);
}

function calcMaxDistance(accelKmS2, timeSec) {
  if (useWasm && wasmModule) {
    return wasmModule.brachistochrone_max_distance(accelKmS2, timeSec);
  }
  return jsBrachistochroneMaxDistance(accelKmS2, timeSec);
}

// --- Constants ---

const KM_PER_AU = 149_597_870.7;
const G = 9.80665e-3; // 1g in km/s²

// --- Presets ---

const PRESETS = {
  ep01_canonical: {
    label: "Episode 1 (48,000 t, 72h, closest)",
    distanceAU: 3.68,
    massT: 48000,
    timeH: 72,
    thrustMN: 9.8,
  },
  ep01_150h: {
    label: "Normal route (48,000 t, 150h)",
    distanceAU: 3.68,
    massT: 48000,
    timeH: 150,
    thrustMN: 9.8,
  },
  mass_48t: {
    label: "Mass = 48 t (if 48,000 kg)",
    distanceAU: 3.68,
    massT: 48,
    timeH: 72,
    thrustMN: 9.8,
  },
  mass_4800t: {
    label: "Mass = 4,800 t (order-of-mag fix)",
    distanceAU: 3.68,
    massT: 4800,
    timeH: 72,
    thrustMN: 9.8,
  },
};

// --- UI update ---

function formatNumber(n, decimals) {
  if (Math.abs(n) >= 1e6) return n.toExponential(decimals);
  if (Math.abs(n) >= 1000) return n.toLocaleString("en", { maximumFractionDigits: decimals });
  return n.toFixed(decimals);
}

function updateCalculator() {
  const distanceAU = parseFloat(document.getElementById("calc-distance").value);
  const massT = parseFloat(document.getElementById("calc-mass").value);
  const timeH = parseFloat(document.getElementById("calc-time").value);
  const thrustMN = 9.8; // Fixed: Kestrel's thrust

  if (isNaN(distanceAU) || isNaN(massT) || isNaN(timeH) || timeH <= 0 || massT <= 0 || distanceAU <= 0) {
    return;
  }

  const distanceKm = distanceAU * KM_PER_AU;
  const timeSec = timeH * 3600;
  const massKg = massT * 1000;
  const thrustN = thrustMN * 1e6;

  // Required values for the transfer
  const reqAccelKmS2 = calcAccel(distanceKm, timeSec);
  const reqDvKmS = calcDv(distanceKm, timeSec);
  const reqAccelG = reqAccelKmS2 / G;

  // Ship capability
  const shipAccelKmS2 = thrustN / (massKg * 1000); // N / kg, then /1000 for km/s²
  const shipAccelG = shipAccelKmS2 / G;
  const shipDvKmS = shipAccelKmS2 * timeSec;
  const shipMaxDistKm = calcMaxDistance(shipAccelKmS2, timeSec);
  const shipMaxDistAU = shipMaxDistKm / KM_PER_AU;

  // Ratios
  const accelRatio = reqAccelKmS2 / shipAccelKmS2;
  const dvRatio = reqDvKmS / shipDvKmS;

  // Update display values
  document.getElementById("calc-distance-val").textContent = distanceAU.toFixed(2) + " AU";
  document.getElementById("calc-mass-val").textContent = formatNumber(massT, 0) + " t";
  document.getElementById("calc-time-val").textContent = timeH.toFixed(0) + " h";

  // Results table
  document.getElementById("res-req-accel").textContent =
    formatNumber(reqAccelKmS2 * 1000, 2) + " m/s\u00B2 (" + formatNumber(reqAccelG, 2) + " g)";
  document.getElementById("res-req-dv").textContent = formatNumber(reqDvKmS, 2) + " km/s";
  document.getElementById("res-ship-accel").textContent =
    formatNumber(shipAccelKmS2 * 1000, 3) + " m/s\u00B2 (" + formatNumber(shipAccelG, 3) + " g)";
  document.getElementById("res-ship-dv").textContent = formatNumber(shipDvKmS, 2) + " km/s";
  document.getElementById("res-ship-reach").textContent =
    formatNumber(shipMaxDistKm, 0) + " km (" + formatNumber(shipMaxDistAU, 4) + " AU)";

  // Gap / verdict
  const verdictEl = document.getElementById("res-verdict");
  if (accelRatio <= 1.0) {
    verdictEl.textContent = "Within ship capability";
    verdictEl.className = "verdict verdict-plausible";
  } else if (accelRatio <= 2.0) {
    verdictEl.textContent = formatNumber(accelRatio, 1) + "\u00D7 shortfall (marginal)";
    verdictEl.className = "verdict verdict-indeterminate";
  } else {
    verdictEl.textContent = formatNumber(accelRatio, 0) + "\u00D7 shortfall";
    verdictEl.className = "verdict verdict-implausible";
  }

  document.getElementById("res-accel-ratio").textContent = formatNumber(accelRatio, 1) + "\u00D7";
  document.getElementById("res-dv-ratio").textContent = formatNumber(dvRatio, 1) + "\u00D7";
}

// --- Preset buttons ---

function applyPreset(key) {
  const p = PRESETS[key];
  if (!p) return;

  document.getElementById("calc-distance").value = p.distanceAU;
  document.getElementById("calc-mass").value = p.massT;
  document.getElementById("calc-time").value = p.timeH;

  // Update range sliders to match
  syncSliderFromInput("calc-distance", "calc-distance-range");
  syncSliderFromInput("calc-mass", "calc-mass-range");
  syncSliderFromInput("calc-time", "calc-time-range");

  updateCalculator();
}

function syncSliderFromInput(inputId, sliderId) {
  const input = document.getElementById(inputId);
  const slider = document.getElementById(sliderId);
  if (input && slider) slider.value = input.value;
}

function syncInputFromSlider(sliderId, inputId) {
  const input = document.getElementById(inputId);
  const slider = document.getElementById(sliderId);
  if (input && slider) input.value = slider.value;
}

// --- Init ---

function initCalculator() {
  // Bind slider ↔ input sync
  const pairs = [
    ["calc-distance-range", "calc-distance"],
    ["calc-mass-range", "calc-mass"],
    ["calc-time-range", "calc-time"],
  ];

  for (const [sliderId, inputId] of pairs) {
    const slider = document.getElementById(sliderId);
    const input = document.getElementById(inputId);
    if (slider && input) {
      slider.addEventListener("input", () => {
        syncInputFromSlider(sliderId, inputId);
        updateCalculator();
      });
      input.addEventListener("input", () => {
        syncSliderFromInput(inputId, sliderId);
        updateCalculator();
      });
    }
  }

  // Bind preset buttons
  for (const key of Object.keys(PRESETS)) {
    const btn = document.getElementById("preset-" + key);
    if (btn) btn.addEventListener("click", () => applyPreset(key));
  }

  // Initial calculation
  updateCalculator();

  // Try loading WASM in background
  tryLoadWasm();
}

// Start when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initCalculator);
} else {
  initCalculator();
}
