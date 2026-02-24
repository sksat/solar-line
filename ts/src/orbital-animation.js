/**
 * Interactive Orbital Animation — browser module.
 *
 * Discovers all animated orbital diagrams (data-animated="true"),
 * reads embedded animation JSON, and creates time slider + play/pause
 * controls for animating celestial body positions and transfer arcs.
 *
 * Animation approach (Codex-reviewed):
 * - Body positions: angle = initialAngle + meanMotion * t
 * - Ship position: getPointAtLength() along the SVG transfer path
 * - Burn visualization: exhaust plume trails ship marker during active burns
 * - Canonical timeline: t in seconds from 0 to durationSeconds
 */

/** Burn type → plume color mapping */
var BURN_COLORS = {
  acceleration: "#ff8800",
  deceleration: "#00ccff",
  midcourse: "#ffdd00",
  capture: "#ff44ff"
};

/**
 * Format time in seconds to a human-readable string.
 * <=72h: hours (e.g. "12.5h")
 * <=30d: days + hours (e.g. "5d 12h")
 * <=365d: days (e.g. "142d")
 * >365d: years + days (e.g. "1y 87d")
 */
function formatTime(seconds, totalDuration) {
  const hours = seconds / 3600;
  if (totalDuration <= 259200) { // <=72h
    return hours.toFixed(1) + "h";
  }
  const days = Math.floor(hours / 24);
  var remainH = Math.floor(hours % 24);
  if (totalDuration <= 2592000) { // <=30d
    if (days === 0) return remainH + "h";
    return days + "d " + remainH + "h";
  }
  if (totalDuration <= 31536000) { // <=365d
    return days + "d";
  }
  // >365d: show years + days
  var years = Math.floor(days / 365);
  var remainD = days % 365;
  if (years === 0) return remainD + "d";
  return years + "y " + remainD + "d";
}

/**
 * Compute the path tangent direction at a given length using finite differences.
 * Returns {dx, dy} normalized unit vector pointing in direction of travel.
 */
function getPathTangent(pathEl, lengthAt, totalLength) {
  var eps = Math.min(1, totalLength * 0.001);
  var l0 = Math.max(0, lengthAt - eps);
  var l1 = Math.min(totalLength, lengthAt + eps);
  var p0 = pathEl.getPointAtLength(l0);
  var p1 = pathEl.getPointAtLength(l1);
  var dx = p1.x - p0.x;
  var dy = p1.y - p0.y;
  var mag = Math.sqrt(dx * dx + dy * dy);
  if (mag < 0.001) return { dx: 1, dy: 0 };
  return { dx: dx / mag, dy: dy / mag };
}

/**
 * Create SVG exhaust plume group element (pre-created, hidden by default).
 * The plume is a small wedge/triangle that trails behind the ship marker.
 */
function createPlumeElement() {
  var ns = "http://www.w3.org/2000/svg";
  var g = document.createElementNS(ns, "g");
  g.setAttribute("class", "burn-plume");
  g.setAttribute("opacity", "0");

  // Plume flame shape: a tapered wedge pointing left (negative X direction)
  // Will be rotated to point opposite to direction of travel
  var flame = document.createElementNS(ns, "polygon");
  flame.setAttribute("points", "0,-3 -14,0 0,3");
  flame.setAttribute("fill", BURN_COLORS.acceleration);
  flame.setAttribute("opacity", "0.85");
  g.appendChild(flame);

  // Inner brighter core
  var core = document.createElementNS(ns, "polygon");
  core.setAttribute("points", "0,-1.5 -8,0 0,1.5");
  core.setAttribute("fill", "#fff");
  core.setAttribute("opacity", "0.7");
  g.appendChild(core);

  return g;
}

/**
 * Create SVG burn label element (pre-created, hidden by default).
 */
function createBurnLabel() {
  var ns = "http://www.w3.org/2000/svg";
  var text = document.createElementNS(ns, "text");
  text.setAttribute("class", "burn-label-text");
  text.setAttribute("font-size", "8");
  text.setAttribute("fill", "#ffdd00");
  text.setAttribute("text-anchor", "middle");
  text.setAttribute("opacity", "0");
  return text;
}

/**
 * Determine if a burn is currently active at the given transfer-relative time.
 * Burns use transfer-relative time (seconds from transfer startTime).
 */
function isBurnActive(burn, transferRelativeTime) {
  return transferRelativeTime >= burn.startTime && transferRelativeTime <= burn.endTime;
}

/**
 * For brachistochrone transfers without explicit burn markers,
 * infer continuous thrust: first half = acceleration, second half = deceleration.
 */
function inferBrachistochroneBurns(transfer) {
  var midTime = (transfer.endTime - transfer.startTime) / 2;
  return [
    { startTime: 0, endTime: midTime, type: "acceleration", label: "加速" },
    { startTime: midTime, endTime: transfer.endTime - transfer.startTime, type: "deceleration", label: "減速" }
  ];
}

/**
 * Initialize animation for a single diagram card.
 */
function initDiagramAnimation(card) {
  const jsonEl = card.querySelector(".orbital-animation-data");
  if (!jsonEl) return;

  var data;
  try {
    data = JSON.parse(jsonEl.textContent);
  } catch {
    return;
  }

  var svg = card.querySelector("svg");
  if (!svg) return;

  var controls = card.querySelector(".orbital-animation-controls");
  if (!controls) return;

  var slider = controls.querySelector(".anim-slider");
  var playBtn = controls.querySelector(".anim-play");
  var timeDisplay = controls.querySelector(".time-display");

  var duration = data.durationSeconds;
  var playing = false;
  var animFrameId = null;
  var lastTimestamp = null;
  var currentTime = 0;
  // Playback speed: complete animation in ~10 seconds of wall time
  var playbackRate = duration / 10;

  var mainG = svg.querySelector("g");

  // Create ship marker element for each animated transfer
  var shipMarkers = [];
  for (var i = 0; i < data.transfers.length; i++) {
    var transfer = data.transfers[i];

    // Resolve effective burns: explicit from data, or inferred for brachistochrone
    var effectiveBurns = (transfer.burns && transfer.burns.length > 0)
      ? transfer.burns
      : (transfer.style === "brachistochrone" ? inferBrachistochroneBurns(transfer) : []);

    var marker = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    marker.setAttribute("r", "5");
    marker.setAttribute("fill", transfer.color);
    marker.setAttribute("stroke", "#fff");
    marker.setAttribute("stroke-width", "1.5");
    marker.setAttribute("class", "ship-marker");
    marker.setAttribute("opacity", "0");
    if (mainG) mainG.appendChild(marker);

    // Create plume element (one per transfer, reused across burns)
    var plume = createPlumeElement();
    if (mainG) mainG.appendChild(plume);

    // Create burn label element
    var burnLabel = createBurnLabel();
    if (mainG) mainG.appendChild(burnLabel);

    shipMarkers.push({
      marker: marker,
      plume: plume,
      burnLabel: burnLabel,
      transfer: transfer,
      burns: effectiveBurns
    });
  }

  function updateFrame(t) {
    currentTime = Math.max(0, Math.min(duration, t));
    var sliderVal = duration > 0 ? (currentTime / duration) * 1000 : 0;
    slider.value = Math.round(sliderVal);
    slider.setAttribute("aria-valuenow", String(Math.round(sliderVal)));
    timeDisplay.textContent = formatTime(currentTime, duration);

    // Update body positions
    for (var i = 0; i < data.orbits.length; i++) {
      var orbit = data.orbits[i];
      var angle = orbit.initialAngle + orbit.meanMotion * currentTime;
      var r = orbit.radiusPx;
      var cx = r * Math.cos(angle);
      var cy = -r * Math.sin(angle);

      // Find SVG elements by data-orbit-id
      var dots = svg.querySelectorAll('[data-orbit-id="' + orbit.id + '"]');
      for (var j = 0; j < dots.length; j++) {
        var el = dots[j];
        if (el.tagName === "circle") {
          el.setAttribute("cx", cx.toFixed(1));
          el.setAttribute("cy", cy.toFixed(1));
        } else if (el.tagName === "text") {
          var lr = r + 12;
          el.setAttribute("x", (lr * Math.cos(angle)).toFixed(1));
          el.setAttribute("y", (-(lr) * Math.sin(angle)).toFixed(1));
        }
      }
    }

    // Update ship markers along transfer paths
    for (var i = 0; i < shipMarkers.length; i++) {
      var sm = shipMarkers[i];
      var tr = sm.transfer;
      var marker = sm.marker;
      var plume = sm.plume;
      var burnLabel = sm.burnLabel;

      if (currentTime < tr.startTime || currentTime > tr.endTime) {
        marker.setAttribute("opacity", "0");
        plume.setAttribute("opacity", "0");
        burnLabel.setAttribute("opacity", "0");
        continue;
      }

      marker.setAttribute("opacity", "1");

      // Find the SVG path for this transfer
      var pathEl = svg.querySelector('[data-transfer-path="' + tr.pathId + '"]');
      if (!pathEl) {
        marker.setAttribute("opacity", "0");
        plume.setAttribute("opacity", "0");
        burnLabel.setAttribute("opacity", "0");
        continue;
      }

      // Interpolate position along the SVG path using getPointAtLength
      var progress = (currentTime - tr.startTime) / (tr.endTime - tr.startTime);
      progress = Math.max(0, Math.min(1, progress));
      var totalLength = pathEl.getTotalLength();
      var lengthAt = progress * totalLength;
      var point = pathEl.getPointAtLength(lengthAt);
      marker.setAttribute("cx", point.x.toFixed(1));
      marker.setAttribute("cy", point.y.toFixed(1));

      // Check if any burn is active at the current transfer-relative time
      var transferRelTime = currentTime - tr.startTime;
      var activeBurn = null;
      for (var b = 0; b < sm.burns.length; b++) {
        if (isBurnActive(sm.burns[b], transferRelTime)) {
          activeBurn = sm.burns[b];
          break;
        }
      }

      if (activeBurn) {
        // Get path tangent for plume direction
        var tangent = getPathTangent(pathEl, lengthAt, totalLength);

        // Plume points opposite to direction of travel (exhaust behind ship)
        var plumeAngle = Math.atan2(-tangent.dy, -tangent.dx);
        var rad2deg = 180 / Math.PI;

        // Position plume at ship location, rotated to trail behind
        plume.setAttribute("transform",
          "translate(" + point.x.toFixed(1) + "," + point.y.toFixed(1) + ") " +
          "rotate(" + (plumeAngle * rad2deg).toFixed(1) + ")");

        // Set plume color based on burn type
        var burnColor = BURN_COLORS[activeBurn.type] || BURN_COLORS.acceleration;
        var flameEl = plume.querySelector("polygon");
        if (flameEl) flameEl.setAttribute("fill", burnColor);

        // Animate plume opacity with subtle flicker
        var flicker = 0.75 + 0.25 * Math.sin(currentTime * 20);
        plume.setAttribute("opacity", flicker.toFixed(2));

        // Ship marker glow effect during burn
        marker.setAttribute("r", "6");
        marker.setAttribute("stroke", burnColor);

        // Show burn label above ship
        burnLabel.textContent = activeBurn.label;
        burnLabel.setAttribute("x", point.x.toFixed(1));
        burnLabel.setAttribute("y", (point.y - 14).toFixed(1));
        burnLabel.setAttribute("fill", burnColor);
        burnLabel.setAttribute("opacity", "1");
      } else {
        // No active burn — hide plume, reset marker
        plume.setAttribute("opacity", "0");
        marker.setAttribute("r", "5");
        marker.setAttribute("stroke", "#fff");
        burnLabel.setAttribute("opacity", "0");
      }
    }
  }

  function animate(timestamp) {
    if (!playing) return;
    if (lastTimestamp === null) lastTimestamp = timestamp;
    var dt = (timestamp - lastTimestamp) / 1000; // wall seconds
    lastTimestamp = timestamp;
    currentTime += dt * playbackRate;
    if (currentTime >= duration) {
      currentTime = duration;
      playing = false;
      playBtn.textContent = "\u25b6";
      playBtn.setAttribute("aria-label", "\u518d\u751f");
      lastTimestamp = null;
    }
    updateFrame(currentTime);
    if (playing) {
      animFrameId = requestAnimationFrame(animate);
    }
  }

  playBtn.addEventListener("click", function () {
    if (playing) {
      playing = false;
      playBtn.textContent = "\u25b6";
      playBtn.setAttribute("aria-label", "\u518d\u751f");
      lastTimestamp = null;
      if (animFrameId) cancelAnimationFrame(animFrameId);
    } else {
      if (currentTime >= duration) currentTime = 0;
      playing = true;
      playBtn.textContent = "\u23f8";
      playBtn.setAttribute("aria-label", "\u4e00\u6642\u505c\u6b62");
      lastTimestamp = null;
      animFrameId = requestAnimationFrame(animate);
    }
  });

  slider.addEventListener("input", function () {
    var val = parseFloat(slider.value);
    currentTime = (val / 1000) * duration;
    updateFrame(currentTime);
    // Pause when user manually scrubs
    if (playing) {
      playing = false;
      playBtn.textContent = "\u25b6";
      playBtn.setAttribute("aria-label", "\u518d\u751f");
      lastTimestamp = null;
      if (animFrameId) cancelAnimationFrame(animFrameId);
    }
  });

  // Set initial state
  updateFrame(0);
}

/**
 * Initialize all animated diagrams on the page.
 * Also registers a visibility change handler to pause animations when the tab
 * is hidden, saving CPU/battery.
 */
function initAllAnimations() {
  var cards = document.querySelectorAll('.orbital-diagram[data-animated="true"]');
  for (var i = 0; i < cards.length; i++) {
    initDiagramAnimation(cards[i]);
  }

  // Pause all playing animations when the page tab is hidden
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      var playBtns = document.querySelectorAll(".anim-play");
      for (var j = 0; j < playBtns.length; j++) {
        if (playBtns[j].textContent === "\u23f8") {
          playBtns[j].click(); // triggers pause via existing click handler
        }
      }
    }
  });
}

// Start when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initAllAnimations);
} else {
  initAllAnimations();
}
