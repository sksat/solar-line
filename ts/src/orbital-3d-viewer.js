/**
 * Orbital 3D Viewer — Three.js-based interactive 3D orbital visualization.
 * Browser-only module loaded via importmap (Three.js from CDN).
 */
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { CSS2DRenderer, CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";

// ── Scene state ──
let scene, camera, renderer, labelRenderer, controls;
let currentSceneGroup = null;

// ── Timeline animation state ──
let timelineData = null;
let timelinePlaying = false;
let timelineAnimFrameId = null;
let timelineLastTimestamp = null;
let timelineCurrentDay = 0;
let shipMarker3D = null;
let planetMeshes = {}; // name → THREE.Mesh
let planetLabels = {}; // name → CSS2DObject
let transferCurves = []; // Array of { curve, startDay, endDay, episode }

// ── Constants matching orbital-3d-viewer-data.ts ──
const AU_TO_SCENE = 5;

const PLANET_COLORS = {
  mars: 0xe05050,
  jupiter: 0xe0a040,
  saturn: 0xd4b896,
  uranus: 0x7ec8e3,
  earth: 0x4488ff,
  enceladus: 0xccddee,
  titania: 0xaabbcc,
};

const EPISODE_COLORS = {
  1: 0xff6644,
  2: 0xffaa22,
  3: 0x44cc88,
  4: 0x4488ff,
  5: 0xff4444,
};

// ── Initialization ──

export function initViewer(container) {
  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0d1117);

  // Camera
  camera = new THREE.PerspectiveCamera(
    50,
    container.clientWidth / container.clientHeight,
    0.1,
    1000,
  );
  camera.position.set(30, 20, 30);
  camera.lookAt(0, 0, 0);

  // WebGL renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  container.appendChild(renderer.domElement);

  // CSS2D label renderer
  labelRenderer = new CSS2DRenderer();
  labelRenderer.setSize(container.clientWidth, container.clientHeight);
  labelRenderer.domElement.style.position = "absolute";
  labelRenderer.domElement.style.top = "0";
  labelRenderer.domElement.style.pointerEvents = "none";
  container.appendChild(labelRenderer.domElement);

  // Controls
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 2;
  controls.maxDistance = 200;

  // Ambient + directional light
  scene.add(new THREE.AmbientLight(0x404040, 2));
  const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
  dirLight.position.set(10, 20, 15);
  scene.add(dirLight);

  // Origin marker (Sun for full-route, central body for local scenes)
  const sunGeo = new THREE.SphereGeometry(0.3, 16, 16);
  const sunMat = new THREE.MeshBasicMaterial({ color: 0xffdd44 });
  const sun = new THREE.Mesh(sunGeo, sunMat);
  sun.name = "origin";
  scene.add(sun);

  // Resize handler
  window.addEventListener("resize", () => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    labelRenderer.setSize(w, h);
  });

  // Animation loop
  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
  }
  animate();
}

// ── Scene building ──

export function loadScene(sceneData) {
  // Clear previous scene objects
  if (currentSceneGroup) {
    scene.remove(currentSceneGroup);
    // Dispose label DOM elements
    currentSceneGroup.traverse((obj) => {
      if (obj.isCSS2DObject && obj.element?.parentNode) {
        obj.element.parentNode.removeChild(obj.element);
      }
    });
    disposeGroup(currentSceneGroup);
  }

  currentSceneGroup = new THREE.Group();
  currentSceneGroup.name = sceneData.type;

  // Set origin label
  const origin = scene.getObjectByName("origin");
  if (origin) {
    if (sceneData.type === "full-route") {
      origin.visible = true;
      origin.scale.set(1, 1, 1);
    } else {
      origin.visible = false;
    }
  }

  // Ecliptic plane
  if (sceneData.eclipticPlane) {
    addPlane(currentSceneGroup, sceneData.eclipticPlane, 200);
  }

  // Additional planes
  if (sceneData.planes) {
    for (const planeData of sceneData.planes) {
      addTiltedPlane(currentSceneGroup, planeData, 8);
    }
  }

  // Rings
  if (sceneData.rings) {
    for (const ringData of sceneData.rings) {
      addRing(currentSceneGroup, ringData, sceneData.type);
    }
  }

  // Axes
  if (sceneData.axes) {
    for (const axisData of sceneData.axes) {
      addAxis(currentSceneGroup, axisData);
    }
  }

  // Planets
  for (const planet of sceneData.planets) {
    addPlanet(currentSceneGroup, planet, sceneData.type);
  }

  // Transfer arcs
  for (const arc of sceneData.transferArcs) {
    addTransferArc(currentSceneGroup, arc);
  }

  scene.add(currentSceneGroup);

  // Adjust camera for scene type
  if (sceneData.type === "full-route") {
    camera.position.set(30, 25, 40);
    controls.target.set(0, 0, 0);
  } else {
    camera.position.set(8, 6, 10);
    controls.target.set(0, 0, 0);
  }
  controls.update();
}

// ── Planet rendering ──

function addPlanet(group, planet, sceneType) {
  const isLocal = sceneType !== "full-route";

  if (isLocal && planet.orbitRadius && !planet.isCentral) {
    // Draw orbit circle for moons
    addOrbitCircle(group, planet.orbitRadius, planet.color);
  }

  const geo = new THREE.SphereGeometry(planet.radius, 24, 24);
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(planet.color),
    roughness: 0.6,
    metalness: 0.1,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(planet.x, planet.z, planet.y); // three.js Y-up: swap y/z
  mesh.name = planet.name;
  group.add(mesh);

  // Label
  if (planet.label) {
    const label = createLabel(planet.label, planet.color);
    label.position.set(planet.x, planet.z + planet.radius + 0.3, planet.y);
    group.add(label);
  }
}

function addOrbitCircle(group, radiusKm, color) {
  // Scale: for local scenes, 1 unit = ~50,000 km
  const sceneRadius = radiusKm / 50000;
  const geo = new THREE.BufferGeometry();
  const points = [];
  for (let i = 0; i <= 64; i++) {
    const angle = (i / 64) * Math.PI * 2;
    points.push(
      new THREE.Vector3(
        sceneRadius * Math.cos(angle),
        0,
        sceneRadius * Math.sin(angle),
      ),
    );
  }
  geo.setFromPoints(points);
  const mat = new THREE.LineBasicMaterial({
    color: new THREE.Color(color),
    opacity: 0.4,
    transparent: true,
  });
  group.add(new THREE.Line(geo, mat));
}

// ── Transfer arc rendering ──

function addTransferArc(group, arc) {
  const from = new THREE.Vector3(arc.fromPos[0], arc.fromPos[2], arc.fromPos[1]);
  const to = new THREE.Vector3(arc.toPos[0], arc.toPos[2], arc.toPos[1]);

  // Create curved arc (quadratic bezier with midpoint raised)
  const mid = new THREE.Vector3().lerpVectors(from, to, 0.5);
  const dist = from.distanceTo(to);
  mid.y += dist * 0.15; // Arc height proportional to distance

  const curve = new THREE.QuadraticBezierCurve3(from, mid, to);
  const points = curve.getPoints(50);
  const geo = new THREE.BufferGeometry().setFromPoints(points);

  const mat = new THREE.LineBasicMaterial({
    color: new THREE.Color(arc.color),
    linewidth: 2,
  });
  group.add(new THREE.Line(geo, mat));

  // Add arrow at endpoint
  const tangent = curve.getTangent(1).normalize();
  const arrowHelper = new THREE.ArrowHelper(
    tangent,
    to,
    dist * 0.05,
    new THREE.Color(arc.color),
    dist * 0.03,
    dist * 0.015,
  );
  group.add(arrowHelper);

  // Add label at midpoint
  if (arc.label) {
    const labelPos = curve.getPoint(0.5);
    const label = createLabel(arc.label, arc.color);
    label.position.copy(labelPos);
    label.position.y += 0.5;
    group.add(label);
  }
}

// ── Ring rendering ──

function addRing(group, ringData, sceneType) {
  const scale = sceneType === "full-route" ? 1 : 1 / 50000;
  const inner = ringData.innerRadius * scale;
  const outer = ringData.outerRadius * scale;

  const geo = new THREE.RingGeometry(inner, outer, 64);
  const mat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(ringData.color),
    transparent: true,
    opacity: ringData.opacity,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geo, mat);

  // Orient ring to match normal vector
  const normal = new THREE.Vector3(...ringData.normal).normalize();
  const defaultNormal = new THREE.Vector3(0, 0, 1);
  const quat = new THREE.Quaternion().setFromUnitVectors(defaultNormal, normal);
  mesh.quaternion.copy(quat);

  // RingGeometry lies in XY plane — rotate to XZ (Three.js Y-up)
  mesh.rotateX(-Math.PI / 2);

  group.add(mesh);
}

// ── Plane rendering ──

function addPlane(group, planeData, size) {
  const geo = new THREE.PlaneGeometry(size, size);
  const mat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(planeData.color),
    transparent: true,
    opacity: planeData.opacity,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2; // Lie flat in XZ plane
  mesh.position.y = (planeData.z ?? 0);
  group.add(mesh);

  // Grid helper
  const grid = new THREE.GridHelper(size, 20, 0x334455, 0x223344);
  grid.position.y = (planeData.z ?? 0) + 0.01;
  group.add(grid);
}

function addTiltedPlane(group, planeData, size) {
  const geo = new THREE.PlaneGeometry(size, size);
  const mat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(planeData.color),
    transparent: true,
    opacity: planeData.opacity,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geo, mat);

  // Orient plane perpendicular to its normal
  const normal = new THREE.Vector3(...planeData.normal).normalize();
  const defaultNormal = new THREE.Vector3(0, 0, 1);
  const quat = new THREE.Quaternion().setFromUnitVectors(defaultNormal, normal);
  mesh.quaternion.copy(quat);

  group.add(mesh);

  // Label
  if (planeData.label) {
    const label = createLabel(planeData.label, planeData.color);
    label.position.set(size * 0.4, 0, size * 0.4);
    group.add(label);
  }
}

// ── Axis rendering ──

function addAxis(group, axisData) {
  const dir = new THREE.Vector3(...axisData.direction).normalize();
  const length = 8;
  const origin = new THREE.Vector3(0, 0, 0);
  // Swap y/z for Three.js coordinate system
  const displayDir = new THREE.Vector3(dir.x, dir.z, dir.y);

  const arrowPos = new THREE.ArrowHelper(
    displayDir,
    origin,
    length,
    new THREE.Color(axisData.color),
    0.4,
    0.2,
  );
  group.add(arrowPos);

  // Negative direction (dashed)
  const negDir = displayDir.clone().negate();
  const arrowNeg = new THREE.ArrowHelper(
    negDir,
    origin,
    length * 0.6,
    new THREE.Color(axisData.color),
    0.2,
    0.1,
  );
  group.add(arrowNeg);

  // Label at tip
  const label = createLabel(axisData.label, axisData.color);
  const tipPos = displayDir.clone().multiplyScalar(length + 0.5);
  label.position.copy(tipPos);
  group.add(label);
}

// ── Label helper ──

function createLabel(text, color) {
  const div = document.createElement("div");
  div.textContent = text;
  div.style.color = typeof color === "string" ? color : `#${new THREE.Color(color).getHexString()}`;
  div.style.fontSize = "12px";
  div.style.fontFamily = "sans-serif";
  div.style.textShadow = "0 0 4px #000, 0 0 8px #000";
  div.style.whiteSpace = "nowrap";
  const label = new CSS2DObject(div);
  return label;
}

// ── Timeline animation ──

/**
 * Load timeline data and set up animation structures.
 * Called after loadScene() for the full-route scene.
 */
export function loadTimeline(timeline) {
  timelineData = timeline;
  timelineCurrentDay = 0;
  timelinePlaying = false;
  transferCurves = [];

  if (!timeline || !currentSceneGroup) return;

  // Store references to planet meshes and labels for position updates
  planetMeshes = {};
  planetLabels = {};
  currentSceneGroup.traverse((obj) => {
    if (obj.isMesh && obj.name && obj.name !== "origin") {
      planetMeshes[obj.name] = obj;
    }
    if (obj.isCSS2DObject && obj.element) {
      // Match label to planet by proximity check (labels are near planets)
      const text = obj.element.textContent;
      for (const orbit of timeline.orbits) {
        const displayName = {
          mars: "Mars", jupiter: "Jupiter", saturn: "Saturn",
          uranus: "Uranus", earth: "Earth",
        }[orbit.name];
        if (text === displayName) {
          planetLabels[orbit.name] = obj;
        }
      }
    }
  });

  // Build bezier curves for each transfer arc (matching addTransferArc logic)
  for (let i = 0; i < timeline.transfers.length; i++) {
    const t = timeline.transfers[i];
    const arcData = currentSceneGroup.parent
      ? null
      : null; // We'll reconstruct from orbit data

    // Get from/to positions from timeline orbits at transfer start/end times
    const fromOrbit = getOrbitForTransfer(timeline, t, true);
    const toOrbit = getOrbitForTransfer(timeline, t, false);

    if (fromOrbit && toOrbit) {
      const fromPos = planetPosAtDay(fromOrbit, t.startDay);
      const toPos = planetPosAtDay(toOrbit, t.endDay);

      const from = new THREE.Vector3(fromPos[0], fromPos[2], fromPos[1]);
      const to = new THREE.Vector3(toPos[0], toPos[2], toPos[1]);
      const mid = new THREE.Vector3().lerpVectors(from, to, 0.5);
      const dist = from.distanceTo(to);
      mid.y += dist * 0.15;

      const curve = new THREE.QuadraticBezierCurve3(from, mid, to);
      transferCurves.push({
        curve,
        startDay: t.startDay,
        endDay: t.endDay,
        episode: t.episode,
      });
    }
  }

  // Create ship marker (a bright sphere)
  if (shipMarker3D) {
    currentSceneGroup.remove(shipMarker3D);
  }
  const shipGeo = new THREE.SphereGeometry(0.2, 12, 12);
  const shipMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  shipMarker3D = new THREE.Mesh(shipGeo, shipMat);
  shipMarker3D.visible = false;
  currentSceneGroup.add(shipMarker3D);
}

/** Map transfer to departure/arrival orbit */
function getOrbitForTransfer(timeline, transfer, isDeparture) {
  // Transfer label format: "Mars→Jupiter (72h brachistochrone)"
  // Use episode to index: ep1=Mars→Jupiter, ep2=Jupiter→Saturn, etc.
  const episodeRoutes = {
    1: { from: "mars", to: "jupiter" },
    2: { from: "jupiter", to: "saturn" },
    3: { from: "saturn", to: "uranus" },
    4: { from: "uranus", to: "earth" },
  };
  const route = episodeRoutes[transfer.episode];
  if (!route) return null;
  const planet = isDeparture ? route.from : route.to;
  return timeline.orbits.find((o) => o.name === planet) || null;
}

/** Compute planet position at a given day offset */
function planetPosAtDay(orbit, day) {
  const angle = orbit.initialAngle + orbit.meanMotionPerDay * day;
  const x = orbit.radiusScene * Math.cos(angle);
  const y = orbit.radiusScene * Math.sin(angle);
  return [x, y, orbit.z];
}

/**
 * Update the 3D scene for a given mission day.
 */
export function updateTimelineFrame(day) {
  if (!timelineData || !currentSceneGroup) return;
  timelineCurrentDay = Math.max(0, Math.min(timelineData.totalDays, day));

  // Update planet positions
  for (const orbit of timelineData.orbits) {
    const [x, y, z] = planetPosAtDay(orbit, timelineCurrentDay);
    const mesh = planetMeshes[orbit.name];
    if (mesh) {
      mesh.position.set(x, z, y); // three.js Y-up: swap y/z
    }
    const label = planetLabels[orbit.name];
    if (label) {
      const r = mesh ? mesh.geometry.parameters.radius : 0.15;
      label.position.set(x, z + r + 0.3, y);
    }
  }

  // Update ship marker along active transfer
  if (shipMarker3D) {
    let shipVisible = false;
    for (const tc of transferCurves) {
      if (timelineCurrentDay >= tc.startDay && timelineCurrentDay <= tc.endDay) {
        const progress =
          (timelineCurrentDay - tc.startDay) / (tc.endDay - tc.startDay);
        const point = tc.curve.getPoint(Math.max(0, Math.min(1, progress)));
        shipMarker3D.position.copy(point);
        shipMarker3D.visible = true;
        // Color ship marker by episode
        const epColor = EPISODE_COLORS[tc.episode] || 0xffffff;
        shipMarker3D.material.color.set(epColor);
        shipVisible = true;
        break;
      }
    }
    if (!shipVisible) {
      shipMarker3D.visible = false;
    }
  }
}

/**
 * Start/stop timeline playback.
 */
export function setTimelinePlaying(playing) {
  timelinePlaying = playing;
  if (playing) {
    timelineLastTimestamp = null;
    function animateTimeline(timestamp) {
      if (!timelinePlaying) return;
      if (timelineLastTimestamp === null) timelineLastTimestamp = timestamp;
      const dtMs = timestamp - timelineLastTimestamp;
      timelineLastTimestamp = timestamp;
      // Playback: complete mission in ~15 seconds of wall time
      const playbackRate = timelineData.totalDays / 15;
      timelineCurrentDay += (dtMs / 1000) * playbackRate;
      if (timelineCurrentDay >= timelineData.totalDays) {
        timelineCurrentDay = timelineData.totalDays;
        timelinePlaying = false;
        // Notify UI
        if (window._onTimelineEnd) window._onTimelineEnd();
      }
      updateTimelineFrame(timelineCurrentDay);
      // Notify UI of current day
      if (window._onTimelineUpdate) window._onTimelineUpdate(timelineCurrentDay);
      if (timelinePlaying) {
        timelineAnimFrameId = requestAnimationFrame(animateTimeline);
      }
    }
    timelineAnimFrameId = requestAnimationFrame(animateTimeline);
  } else {
    if (timelineAnimFrameId) {
      cancelAnimationFrame(timelineAnimFrameId);
      timelineAnimFrameId = null;
    }
    timelineLastTimestamp = null;
  }
}

export function getTimelineCurrentDay() {
  return timelineCurrentDay;
}

// ── Cleanup ──

function disposeGroup(group) {
  group.traverse((obj) => {
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) {
      if (Array.isArray(obj.material)) {
        obj.material.forEach((m) => m.dispose());
      } else {
        obj.material.dispose();
      }
    }
  });
}

// ── Info panel update ──

export function updateInfoPanel(panelEl, sceneData) {
  if (!panelEl) return;
  let html = `<h3>${sceneData.title}</h3>`;
  html += `<p>${sceneData.description}</p>`;

  if (sceneData.type === "full-route") {
    html += "<table>";
    html += "<tr><th>レグ</th><th>Z差 (AU)</th><th>傾斜ΔV比</th></tr>";
    // Scene data doesn't have raw analysis; this is filled in from the HTML side
    html += "</table>";
  } else if (sceneData.type === "saturn-ring") {
    const arc = sceneData.transferArcs[0];
    if (arc?.approachAngleDeg) {
      html += `<p>接近角: <strong>${arc.approachAngleDeg.toFixed(1)}°</strong>（リング面に対して）</p>`;
    }
    if (sceneData.rings?.[0]) {
      const r = sceneData.rings[0];
      html += `<p>リング: ${(r.innerRadius / 1000).toFixed(0)}–${(r.outerRadius / 1000).toFixed(0)} ×10³ km</p>`;
    }
  } else if (sceneData.type === "uranus-approach") {
    for (const arc of sceneData.transferArcs) {
      if (arc.approachAngleDeg !== undefined) {
        html += `<p>${arc.label}: <strong>${arc.approachAngleDeg.toFixed(1)}°</strong></p>`;
      }
    }
    const eq = sceneData.planes?.find((p) => p.type === "equatorial");
    if (eq?.tiltDeg) {
      html += `<p>赤道面傾斜: <strong>${eq.tiltDeg}°</strong></p>`;
    }
  }

  panelEl.innerHTML = html;
}
