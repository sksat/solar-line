/**
 * Interactive Brachistochrone Calculator — browser module.
 *
 * Loaded on episode pages to let users explore transfer parameters.
 * Uses WASM if available, falls back to pure JS.
 *
 * Episode-aware: reads data-episode from the calculator container
 * to show relevant presets for the current episode.
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
    if (badge) badge.textContent = "エンジン: WASM";
  } catch {
    useWasm = false;
    const badge = document.getElementById("calc-engine-badge");
    if (badge) badge.textContent = "エンジン: JS（WASM利用不可）";
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

// --- Per-Episode Presets ---
// Each episode's brachistochrone transfers with key parameter variations.

const EPISODE_PRESETS = {
  1: {
    defaults: { distanceAU: 3.68, massT: 48000, timeH: 72, thrustMN: 9.8 },
    presets: {
      ep01_72h: {
        label: "火星→ガニメデ 72h（作中描写）",
        distanceAU: 3.68, massT: 48000, timeH: 72, thrustMN: 9.8,
      },
      ep01_150h: {
        label: "通常ルート 150h",
        distanceAU: 3.68, massT: 48000, timeH: 150, thrustMN: 9.8,
      },
      ep01_mass299: {
        label: "質量 ≤299t（成立条件）",
        distanceAU: 3.68, massT: 299, timeH: 72, thrustMN: 9.8,
      },
      ep01_mass48: {
        label: "質量 48t（48,000kg解釈）",
        distanceAU: 3.68, massT: 48, timeH: 72, thrustMN: 9.8,
      },
    },
  },
  2: {
    defaults: { distanceAU: 4.32, massT: 48000, timeH: 27, thrustMN: 9.8 },
    presets: {
      ep02_escape: {
        label: "木星圏脱出 27h（brachistochrone区間）",
        distanceAU: 4.32, massT: 48000, timeH: 27, thrustMN: 9.8,
      },
      ep02_trim1pct: {
        label: "木星→土星 トリム推力1%",
        distanceAU: 7.68, massT: 48000, timeH: 792, thrustMN: 0.098,
      },
      ep02_mass300: {
        label: "木星圏脱出（300t仮定）",
        distanceAU: 4.32, massT: 300, timeH: 27, thrustMN: 9.8,
      },
    },
  },
  3: {
    defaults: { distanceAU: 9.62, massT: 48000, timeH: 143, thrustMN: 9.8 },
    presets: {
      ep03_143h: {
        label: "エンケラドス→タイタニア 143h（作中描写）",
        distanceAU: 9.62, massT: 48000, timeH: 143, thrustMN: 9.8,
      },
      ep03_mass452: {
        label: "質量 ≤452t（成立条件）",
        distanceAU: 9.62, massT: 452, timeH: 143, thrustMN: 9.8,
      },
      ep03_mass300: {
        label: "質量 300t（EP01と一致する場合）",
        distanceAU: 9.62, massT: 300, timeH: 143, thrustMN: 9.8,
      },
    },
  },
  4: {
    defaults: { distanceAU: 18.2, massT: 48000, timeH: 2520, thrustMN: 6.37 },
    presets: {
      ep04_damaged: {
        label: "タイタニア→地球 65%推力（作中描写）",
        distanceAU: 18.2, massT: 48000, timeH: 2520, thrustMN: 6.37,
      },
      ep04_mass300: {
        label: "質量 300t・65%推力",
        distanceAU: 18.2, massT: 300, timeH: 200, thrustMN: 6.37,
      },
      ep04_full_thrust: {
        label: "仮に100%推力が使えた場合",
        distanceAU: 18.2, massT: 48000, timeH: 2520, thrustMN: 9.8,
      },
    },
  },
  5: {
    defaults: { distanceAU: 18.2, massT: 48000, timeH: 507, thrustMN: 6.37 },
    presets: {
      ep05_composite: {
        label: "天王星→地球 507h 複合航路（作中描写）",
        distanceAU: 18.2, massT: 48000, timeH: 507, thrustMN: 6.37,
      },
      ep05_mass300: {
        label: "質量 300t・65%推力",
        distanceAU: 18.2, massT: 300, timeH: 200, thrustMN: 6.37,
      },
      ep05_direct: {
        label: "仮に直行ルート（フライバイなし）",
        distanceAU: 18.2, massT: 300, timeH: 507, thrustMN: 6.37,
      },
      ep05_nozzle_limit: {
        label: "ノズル寿命 55h38m（最大燃焼時間）",
        distanceAU: 18.2, massT: 300, timeH: 111, thrustMN: 6.37,
      },
    },
  },
};

// Legacy flat PRESETS for backward compatibility (used if no data-episode)
const PRESETS = EPISODE_PRESETS[1].presets;

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
  const thrustEl = document.getElementById("calc-thrust");
  const thrustMN = thrustEl ? parseFloat(thrustEl.value) : 9.8;

  if (isNaN(distanceAU) || isNaN(massT) || isNaN(timeH) || timeH <= 0 || massT <= 0 || distanceAU <= 0) {
    const verdictEl = document.getElementById("res-verdict");
    if (verdictEl) {
      verdictEl.textContent = "値が無効です";
      verdictEl.className = "verdict verdict-indeterminate";
    }
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

  // Update display values (some elements may not exist in the template)
  function setTextById(id, text) {
    var el = document.getElementById(id);
    if (el) el.textContent = text;
  }
  setTextById("calc-distance-val", distanceAU.toFixed(2) + " AU");
  setTextById("calc-mass-val", formatNumber(massT, 0) + " t");
  setTextById("calc-time-val", timeH.toFixed(0) + " h");

  // Results table
  setTextById("res-req-accel",
    formatNumber(reqAccelKmS2 * 1000, 2) + " m/s\u00B2 (" + formatNumber(reqAccelG, 2) + " g)");
  setTextById("res-req-dv", formatNumber(reqDvKmS, 2) + " km/s");
  setTextById("res-ship-accel",
    formatNumber(shipAccelKmS2 * 1000, 3) + " m/s\u00B2 (" + formatNumber(shipAccelG, 3) + " g)");
  setTextById("res-ship-dv", formatNumber(shipDvKmS, 2) + " km/s");
  setTextById("res-ship-reach",
    formatNumber(shipMaxDistKm, 0) + " km (" + formatNumber(shipMaxDistAU, 4) + " AU)");

  // Gap / verdict
  const verdictEl = document.getElementById("res-verdict");
  if (verdictEl) {
    if (accelRatio <= 1.0) {
      verdictEl.textContent = "船の性能内";
      verdictEl.className = "verdict verdict-plausible";
    } else if (accelRatio <= 2.0) {
      verdictEl.textContent = formatNumber(accelRatio, 1) + "\u00D7 不足（限界的）";
      verdictEl.className = "verdict verdict-indeterminate";
    } else {
      verdictEl.textContent = formatNumber(accelRatio, 0) + "\u00D7 不足";
      verdictEl.className = "verdict verdict-implausible";
    }
  }

  setTextById("res-accel-ratio", formatNumber(accelRatio, 1) + "\u00D7");
  setTextById("res-dv-ratio", formatNumber(dvRatio, 1) + "\u00D7");
  setTextById("res-thrust-val", formatNumber(thrustMN, 2) + " MN");
}

// --- Thrust slider sync ---

function syncThrustDisplay() {
  const thrustEl = document.getElementById("calc-thrust");
  const valEl = document.getElementById("calc-thrust-val");
  if (thrustEl && valEl) {
    valEl.textContent = parseFloat(thrustEl.value).toFixed(2) + " MN";
  }
}

// --- Preset buttons ---

function applyPreset(key) {
  // Search current episode presets first, then all episodes
  let p = null;
  for (const ep of Object.values(EPISODE_PRESETS)) {
    if (ep.presets[key]) { p = ep.presets[key]; break; }
  }
  if (!p) return;

  document.getElementById("calc-distance").value = p.distanceAU;
  document.getElementById("calc-mass").value = p.massT;
  document.getElementById("calc-time").value = p.timeH;

  // Update thrust if the control exists
  const thrustEl = document.getElementById("calc-thrust");
  if (thrustEl) {
    thrustEl.value = p.thrustMN;
    syncSliderFromInput("calc-thrust", "calc-thrust-range");
    syncThrustDisplay();
  }

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
    ["calc-thrust-range", "calc-thrust"],
  ];

  for (const [sliderId, inputId] of pairs) {
    const slider = document.getElementById(sliderId);
    const input = document.getElementById(inputId);
    if (slider && input) {
      slider.addEventListener("input", () => {
        syncInputFromSlider(sliderId, inputId);
        if (inputId === "calc-thrust") syncThrustDisplay();
        updateCalculator();
      });
      input.addEventListener("input", () => {
        syncSliderFromInput(inputId, sliderId);
        if (inputId === "calc-thrust") syncThrustDisplay();
        updateCalculator();
      });
    }
  }

  // Bind all preset buttons (search by data-preset attribute or id prefix)
  const presetBtns = document.querySelectorAll("[data-preset]");
  for (const btn of presetBtns) {
    const key = btn.getAttribute("data-preset");
    btn.addEventListener("click", () => applyPreset(key));
  }

  // Fallback: bind by id prefix for backward compatibility
  for (const epPresets of Object.values(EPISODE_PRESETS)) {
    for (const key of Object.keys(epPresets.presets)) {
      const btn = document.getElementById("preset-" + key);
      if (btn && !btn.hasAttribute("data-preset")) {
        btn.addEventListener("click", () => applyPreset(key));
      }
    }
  }

  // Initial thrust display
  syncThrustDisplay();

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
