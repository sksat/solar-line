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
