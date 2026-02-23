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
 * - Canonical timeline: t in seconds from 0 to durationSeconds
 */

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

  // Create ship marker element for each animated transfer
  var shipMarkers = [];
  for (var i = 0; i < data.transfers.length; i++) {
    var transfer = data.transfers[i];
    var marker = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    marker.setAttribute("r", "5");
    marker.setAttribute("fill", transfer.color);
    marker.setAttribute("stroke", "#fff");
    marker.setAttribute("stroke-width", "1.5");
    marker.setAttribute("class", "ship-marker");
    marker.setAttribute("opacity", "0");
    // Insert into the main <g> element
    var mainG = svg.querySelector("g");
    if (mainG) mainG.appendChild(marker);
    shipMarkers.push({ marker: marker, transfer: transfer });
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

      if (currentTime < tr.startTime || currentTime > tr.endTime) {
        marker.setAttribute("opacity", "0");
        continue;
      }

      marker.setAttribute("opacity", "1");

      // Find the SVG path for this transfer
      var pathEl = svg.querySelector('[data-transfer-path="' + tr.pathId + '"]');
      if (!pathEl) {
        marker.setAttribute("opacity", "0");
        continue;
      }

      // Interpolate position along the SVG path using getPointAtLength
      var progress = (currentTime - tr.startTime) / (tr.endTime - tr.startTime);
      progress = Math.max(0, Math.min(1, progress));
      var totalLength = pathEl.getTotalLength();
      var point = pathEl.getPointAtLength(progress * totalLength);
      marker.setAttribute("cx", point.x.toFixed(1));
      marker.setAttribute("cy", point.y.toFixed(1));
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
      playBtn.textContent = "▶";
      playBtn.setAttribute("aria-label", "再生");
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
      playBtn.textContent = "▶";
      playBtn.setAttribute("aria-label", "再生");
      lastTimestamp = null;
      if (animFrameId) cancelAnimationFrame(animFrameId);
    } else {
      if (currentTime >= duration) currentTime = 0;
      playing = true;
      playBtn.textContent = "⏸";
      playBtn.setAttribute("aria-label", "一時停止");
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
      playBtn.textContent = "▶";
      playBtn.setAttribute("aria-label", "再生");
      lastTimestamp = null;
      if (animFrameId) cancelAnimationFrame(animFrameId);
    }
  });

  // Set initial state
  updateFrame(0);
}

/**
 * Initialize all animated diagrams on the page.
 */
function initAllAnimations() {
  var cards = document.querySelectorAll('.orbital-diagram[data-animated="true"]');
  for (var i = 0; i < cards.length; i++) {
    initDiagramAnimation(cards[i]);
  }
}

// Start when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initAllAnimations);
} else {
  initAllAnimations();
}
