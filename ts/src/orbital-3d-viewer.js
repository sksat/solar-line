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
let _shipLabel3D = null; // CSS2DObject label above ship marker
let planetMeshes = {}; // name → THREE.Mesh
let planetLabels = {}; // name → CSS2DObject
let transferCurves = []; // Array of { curve, startDay, endDay, episode }
let _sceneTransferArcs = null; // Store current scene's transfer arc data for local scenes
let _viewMode = "inertial"; // "inertial" or "ship"
let _cameraOffset = new THREE.Vector3(5, 8, 10); // offset from ship in ship-frame mode
let _animationSpeed = 1.0; // Playback speed multiplier (0.5, 1, 2, 4)
let _inertialCameraPos = new THREE.Vector3(30, 25, 40);
let _inertialCameraTarget = new THREE.Vector3(0, 0, 0);
let _scenarioObjects = {}; // scenarioId → Array<THREE.Object3D> (for show/hide)
let _activeScenarios = new Set(); // currently visible scenario IDs
let _currentSceneData = null; // store for info panel updates
let _planetDisplayRadii = {}; // name → actual rendered sphere radius (populated during scene build)

// ── Constants matching orbital-3d-viewer-data.ts ──
const AU_TO_SCENE = 5;

const PLANET_COLORS = {
  mars: 0xe05050,
  jupiter: 0xe0a040,
  saturn: 0xd4b896,
  uranus: 0x7ec8e3,
  earth: 0x4488ff,
  enceladus: 0xccddee,
  rhea: 0xeab308,
  titan: 0xd2a8ff,
  titania: 0xaabbcc,
  miranda: 0x3b82f6,
  oberon: 0xf97316,
};

const EPISODE_COLORS = {
  1: 0xff6644,
  2: 0xffaa22,
  3: 0x44cc88,
  4: 0x4488ff,
  5: 0xff4444,
};

/** Planet display radii in scene units (base values, before any scale multiplier) */
const PLANET_RADII = {
  mars: 0.15,
  jupiter: 0.4,
  saturn: 0.35,
  uranus: 0.25,
  earth: 0.15,
  enceladus: 0.08,
  rhea: 0.08,
  titan: 0.1,
  titania: 0.08,
  miranda: 0.06,
  oberon: 0.08,
};

/**
 * Offset a point away from a planet center along the transfer direction.
 * Returns a new Vector3 that is `offset` scene units away from `planet` toward `other`.
 * Uses actual rendered sphere radius from planetMeshes when available,
 * falling back to PLANET_RADII lookup.
 */
function offsetFromPlanet(point, otherPoint, planetName, sceneType) {
  const isLocal = sceneType !== "full-route";
  // Use actual rendered sphere radius: scene build cache → mesh geometry → PLANET_RADII fallback
  let displayRadius = _planetDisplayRadii[planetName];
  if (displayRadius == null) {
    const mesh = planetMeshes[planetName];
    if (mesh && mesh.geometry && mesh.geometry.parameters) {
      displayRadius = mesh.geometry.parameters.radius;
    } else {
      const baseRadius = PLANET_RADII[planetName] || 0.15;
      displayRadius = isLocal ? baseRadius : baseRadius * 3;
    }
  }
  // Offset by 1.5× display radius to clear the sphere surface
  const offset = displayRadius * 1.5;
  const dir = new THREE.Vector3().subVectors(otherPoint, point).normalize();
  return new THREE.Vector3().copy(point).addScaledVector(dir, offset);
}

/**
 * Compute a Bezier control point for a transfer arc that curves in the ecliptic plane,
 * matching how 2D orbital diagrams render brachistochrone/Hohmann arcs.
 *
 * In Three.js Y-up: X and Z are the ecliptic plane, Y is ecliptic height.
 * The control point is placed at the angular midpoint (around the Sun at origin)
 * at the average orbital radius, with a z-height bump for visual depth.
 */
function arcControlPoint(from, to) {
  // Compute ecliptic-plane angles from origin (Sun)
  const fromAngle = Math.atan2(from.z, from.x);
  const toAngle = Math.atan2(to.z, to.x);

  // Angular midpoint — handle wrapping correctly
  let dAngle = toAngle - fromAngle;
  if (dAngle > Math.PI) dAngle -= 2 * Math.PI;
  if (dAngle < -Math.PI) dAngle += 2 * Math.PI;
  const midAngle = fromAngle + dAngle * 0.5;

  // Average radius in the ecliptic plane
  const fromR = Math.sqrt(from.x * from.x + from.z * from.z);
  const toR = Math.sqrt(to.x * to.x + to.z * to.z);
  const midR = (fromR + toR) / 2;

  // In-plane position at angular midpoint
  const cx = midR * Math.cos(midAngle);
  const cz = midR * Math.sin(midAngle);

  // Y (ecliptic height): interpolate from endpoints + small bump for depth
  const midY = (from.y + to.y) / 2;
  const dist = from.distanceTo(to);
  const yBump = dist * 0.08; // Reduced from 0.15 since we now have in-plane curvature

  return new THREE.Vector3(cx, midY + yBump, cz);
}

/**
 * Compute a Bezier control point for local (planet-centric) scenes.
 * Instead of curving around the Sun (which is off-screen), offset the midpoint
 * laterally (perpendicular to the approach direction) to suggest a flyby trajectory.
 */
function arcControlPointLocal(from, to) {
  const mid = new THREE.Vector3().lerpVectors(from, to, 0.5);
  const dist = from.distanceTo(to);

  // Lateral direction: cross product of approach vector with Y-up
  const approach = new THREE.Vector3().subVectors(to, from).normalize();
  const up = new THREE.Vector3(0, 1, 0);
  const lateral = new THREE.Vector3().crossVectors(approach, up).normalize();

  // Offset laterally by 20% of chord distance for a visible curve
  mid.addScaledVector(lateral, dist * 0.2);
  // Small Y bump for depth
  mid.y += dist * 0.08;

  return mid;
}

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
  _sceneTransferArcs = sceneData.transferArcs || null;
  _currentSceneData = sceneData;
  _scenarioObjects = {};
  _activeScenarios = new Set();

  // Initialize active scenarios (all visible by default)
  if (sceneData.scenarios) {
    for (const s of sceneData.scenarios) {
      _activeScenarios.add(s.id);
    }
  }

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

  // Orbit circles (planetary paths)
  if (sceneData.orbitCircles) {
    for (const oc of sceneData.orbitCircles) {
      addFullRouteOrbitCircle(currentSceneGroup, oc.radiusScene, oc.color, oc.z, oc.name);
    }
  }

  // Build a map of planet→scenarioId from transfer arcs (IF moons belong to their scenario)
  const planetScenarioMap = {};
  if (sceneData.scenarios && sceneData.transferArcs) {
    for (const arc of sceneData.transferArcs) {
      if (arc.scenarioId && arc.isCounterfactual && arc.to) {
        planetScenarioMap[arc.to] = arc.scenarioId;
      }
    }
  }

  // Planets — build display radius map for offsetFromPlanet collision avoidance
  _planetDisplayRadii = {};
  for (const planet of sceneData.planets) {
    const isLocal = sceneData.type !== "full-route";
    _planetDisplayRadii[planet.name] = isLocal ? planet.radius : planet.radius * 3;
    addPlanet(currentSceneGroup, planet, sceneData.type, planetScenarioMap[planet.name]);
  }

  // Transfer arcs
  for (const arc of sceneData.transferArcs) {
    addTransferArc(currentSceneGroup, arc, sceneData.type);
  }

  scene.add(currentSceneGroup);

  // Adjust camera for scene type
  if (sceneData.type === "full-route") {
    _inertialCameraPos.set(30, 25, 40);
    _inertialCameraTarget.set(0, 0, 0);
  } else if (sceneData.type.startsWith("episode-")) {
    // Focus camera on transfer arc and its departure/arrival planets.
    // Data coords: [x_ecliptic, y_ecliptic, z_height]
    // Three.js Y-up: (data[0], data[2], data[1])
    const threePositions = [];
    for (const arc of sceneData.transferArcs) {
      if (arc.fromPos) threePositions.push(new THREE.Vector3(arc.fromPos[0], arc.fromPos[2], arc.fromPos[1]));
      if (arc.toPos) threePositions.push(new THREE.Vector3(arc.toPos[0], arc.toPos[2], arc.toPos[1]));
    }
    // Also include all visible planet positions for a complete bounding box
    for (const p of sceneData.planets) {
      threePositions.push(new THREE.Vector3(p.x, p.z, p.y));
    }
    if (threePositions.length > 0) {
      const bbox = new THREE.Box3();
      for (const p of threePositions) bbox.expandByPoint(p);
      const center = new THREE.Vector3();
      bbox.getCenter(center);
      const size = new THREE.Vector3();
      bbox.getSize(size);
      const span = Math.max(size.x, size.y, size.z, 5);
      const camDist = span * 1.5;

      // Camera direction: outward from origin through arc center, elevated 35°
      const radialDir = new THREE.Vector3(center.x, 0, center.z);
      const radialLen = radialDir.length();
      if (radialLen > 0.01) {
        radialDir.normalize();
      } else {
        radialDir.set(1, 0, 0);
      }
      // Elevate: 35° above ecliptic plane
      const elevAngle = 35 * Math.PI / 180;
      const camDir = new THREE.Vector3(
        radialDir.x * Math.cos(elevAngle),
        Math.sin(elevAngle),
        radialDir.z * Math.cos(elevAngle),
      ).normalize();

      _inertialCameraPos.set(
        center.x + camDir.x * camDist,
        center.y + camDir.y * camDist,
        center.z + camDir.z * camDist,
      );
      _inertialCameraTarget.copy(center);
    } else {
      _inertialCameraPos.set(8, 6, 10);
      _inertialCameraTarget.set(0, 0, 0);
    }
  } else {
    _inertialCameraPos.set(8, 6, 10);
    _inertialCameraTarget.set(0, 0, 0);
  }
  camera.position.copy(_inertialCameraPos);
  controls.target.copy(_inertialCameraTarget);
  controls.update();
}

// ── Planet rendering ──

// Planet texture URLs (Solar System Scope, CC BY 4.0)
// Attribution: Solar System Scope, https://www.solarsystemscope.com/textures/
const PLANET_TEXTURE_URLS = {
  earth: "https://www.solarsystemscope.com/textures/download/2k_earth_daymap.jpg",
  mars: "https://www.solarsystemscope.com/textures/download/2k_mars.jpg",
  jupiter: "https://www.solarsystemscope.com/textures/download/2k_jupiter.jpg",
  saturn: "https://www.solarsystemscope.com/textures/download/2k_saturn.jpg",
  uranus: "https://www.solarsystemscope.com/textures/download/2k_uranus.jpg",
};

const textureLoader = typeof THREE !== "undefined" ? new THREE.TextureLoader() : null;

function addPlanet(group, planet, sceneType, scenarioId) {
  const isLocal = sceneType !== "full-route";

  let orbitCircleLine = null;
  if (isLocal && planet.orbitRadius && !planet.isCentral) {
    // Draw orbit circle for moons
    orbitCircleLine = addOrbitCircle(group, planet.orbitRadius, planet.color);
  }

  // Emphasize planet sizes in full-route view (3× scale) for visibility
  const displayRadius = isLocal ? planet.radius : planet.radius * 3;
  const geo = new THREE.SphereGeometry(displayRadius, 32, 32);
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(planet.color),
    roughness: 0.6,
    metalness: 0.1,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(planet.x, planet.z, planet.y); // three.js Y-up: swap y/z
  mesh.name = planet.name;
  group.add(mesh);

  // Load texture asynchronously (fallback to solid color on error)
  const textureUrl = PLANET_TEXTURE_URLS[planet.name];
  if (textureUrl && textureLoader) {
    textureLoader.load(
      textureUrl,
      (texture) => {
        mat.map = texture;
        mat.needsUpdate = true;
      },
      undefined,
      () => {
        // Texture load failed — keep solid color fallback
      },
    );
  }

  // Label
  let planetLabel = null;
  if (planet.label) {
    planetLabel = createLabel(planet.label, planet.color);
    planetLabel.position.set(planet.x, planet.z + displayRadius + 0.3, planet.y);
    group.add(planetLabel);
  }

  // Register IF moon objects with their scenario for show/hide toggling
  if (scenarioId) {
    if (!_scenarioObjects[scenarioId]) {
      _scenarioObjects[scenarioId] = [];
    }
    _scenarioObjects[scenarioId].push(mesh);
    if (planetLabel) _scenarioObjects[scenarioId].push(planetLabel);
    if (orbitCircleLine) _scenarioObjects[scenarioId].push(orbitCircleLine);
  }
}

function addFullRouteOrbitCircle(group, radiusScene, color, z, name) {
  const geo = new THREE.BufferGeometry();
  const points = [];
  for (let i = 0; i <= 128; i++) {
    const angle = (i / 128) * Math.PI * 2;
    points.push(
      new THREE.Vector3(
        radiusScene * Math.cos(angle),
        z, // three.js Y-up: z height → Y coordinate
        radiusScene * Math.sin(angle),
      ),
    );
  }
  geo.setFromPoints(points);
  const mat = new THREE.LineBasicMaterial({
    color: new THREE.Color(color),
    opacity: 0.25,
    transparent: true,
  });
  group.add(new THREE.Line(geo, mat));

  // Orbit label at the top of the circle
  if (name) {
    const orbitNames = {
      mars: "火星軌道", jupiter: "木星軌道", saturn: "土星軌道",
      uranus: "天王星軌道", earth: "地球軌道",
      io: "イオ軌道", europa: "エウロパ軌道", ganymede: "ガニメデ軌道", callisto: "カリスト軌道",
      enceladus: "エンケラドス軌道", rhea: "レア軌道", titan: "タイタン軌道",
      miranda: "ミランダ軌道", titania: "タイタニア軌道", oberon: "オベロン軌道",
      luna: "月軌道", leo: "LEO（低軌道）", geo: "GEO（静止軌道）",
    };
    const label = createLabel(orbitNames[name] || name, color);
    label.position.set(0, z + 0.3, -radiusScene); // Top of circle (negative Z = "north")
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
  const line = new THREE.Line(geo, mat);
  group.add(line);
  return line;
}

// ── Transfer arc rendering ──

function addTransferArc(group, arc, sceneType) {
  const fromCenter = new THREE.Vector3(arc.fromPos[0], arc.fromPos[2], arc.fromPos[1]);
  const toCenter = new THREE.Vector3(arc.toPos[0], arc.toPos[2], arc.toPos[1]);

  // Offset endpoints away from planet centers so arcs don't pass through planets
  const from = offsetFromPlanet(fromCenter, toCenter, arc.from, sceneType);
  const to = offsetFromPlanet(toCenter, fromCenter, arc.to, sceneType);

  // Create curved arc with in-plane curvature matching 2D orbital diagrams
  const isLocal = sceneType !== "full-route";
  const mid = isLocal ? arcControlPointLocal(from, to) : arcControlPoint(from, to);

  const curve = new THREE.QuadraticBezierCurve3(from, mid, to);
  const points = curve.getPoints(50);
  const geo = new THREE.BufferGeometry().setFromPoints(points);

  // IF arcs use dashed lines for visual distinction
  const isDashed = arc.isCounterfactual;
  const mat = isDashed
    ? new THREE.LineDashedMaterial({
        color: new THREE.Color(arc.color),
        linewidth: 2,
        dashSize: 0.3,
        gapSize: 0.15,
      })
    : new THREE.LineBasicMaterial({
        color: new THREE.Color(arc.color),
        linewidth: 2,
      });
  const line = new THREE.Line(geo, mat);
  if (isDashed) line.computeLineDistances();
  group.add(line);

  // Add arrow at endpoint
  const dist = from.distanceTo(to);
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
  let arcLabel = null;
  if (arc.label) {
    const labelPos = curve.getPoint(0.5);
    arcLabel = createLabel(arc.label, arc.color);
    arcLabel.position.copy(labelPos);
    arcLabel.position.y += 0.5;
    group.add(arcLabel);
  }

  // Register scenario objects for show/hide toggling
  if (arc.scenarioId) {
    if (!_scenarioObjects[arc.scenarioId]) {
      _scenarioObjects[arc.scenarioId] = [];
    }
    _scenarioObjects[arc.scenarioId].push(line, arrowHelper);
    if (arcLabel) _scenarioObjects[arc.scenarioId].push(arcLabel);
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
  // RingGeometry lies in XY plane (default normal = +Z = (0,0,1))
  // Data normals are in scene coords (x,y,z); Three.js swaps y/z (Y-up)
  const n = ringData.normal;
  const threeNormal = new THREE.Vector3(n[0], n[2], n[1]).normalize();
  const defaultNormal = new THREE.Vector3(0, 0, 1);
  const quat = new THREE.Quaternion().setFromUnitVectors(defaultNormal, threeNormal);
  mesh.quaternion.copy(quat);

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
  // Data normals are in scene coords (x,y,z); Three.js swaps y/z (Y-up)
  const n = planeData.normal;
  const threeNormal = new THREE.Vector3(n[0], n[2], n[1]).normalize();
  const defaultNormal = new THREE.Vector3(0, 0, 1);
  const quat = new THREE.Quaternion().setFromUnitVectors(defaultNormal, threeNormal);
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
      // Match label to planet by name (English or Japanese)
      const text = obj.element.textContent;
      for (const orbit of timeline.orbits) {
        const names = {
          mars: ["Mars", "火星"], jupiter: ["Jupiter", "木星"], saturn: ["Saturn", "土星"],
          uranus: ["Uranus", "天王星"], earth: ["Earth", "地球"],
        }[orbit.name] || [];
        if (names.includes(text)) {
          planetLabels[orbit.name] = obj;
        }
      }
    }
  });

  // Build bezier curves for each transfer arc (matching addTransferArc logic)
  for (let i = 0; i < timeline.transfers.length; i++) {
    const t = timeline.transfers[i];

    // Get from/to positions from timeline orbits at transfer start/end times
    const fromOrbit = getOrbitForTransfer(timeline, t, true);
    const toOrbit = getOrbitForTransfer(timeline, t, false);

    if (fromOrbit && toOrbit) {
      const fromPos = planetPosAtDay(fromOrbit, t.startDay);
      const toPos = planetPosAtDay(toOrbit, t.endDay);

      const fromCenter = new THREE.Vector3(fromPos[0], fromPos[2], fromPos[1]);
      const toCenter = new THREE.Vector3(toPos[0], toPos[2], toPos[1]);
      const sceneType = currentSceneGroup?.name || "full-route";
      const from = offsetFromPlanet(fromCenter, toCenter, fromOrbit.name, sceneType);
      const to = offsetFromPlanet(toCenter, fromCenter, toOrbit.name, sceneType);
      const mid = arcControlPoint(from, to);

      const curve = new THREE.QuadraticBezierCurve3(from, mid, to);
      transferCurves.push({
        curve,
        startDay: t.startDay,
        endDay: t.endDay,
        episode: t.episode,
      });
    } else if (_sceneTransferArcs && _sceneTransferArcs[i]) {
      // For local scenes, use pre-defined transfer arc geometry
      const arc = _sceneTransferArcs[i];
      const fromCenter = new THREE.Vector3(arc.fromPos[0], arc.fromPos[2], arc.fromPos[1]);
      const toCenter = new THREE.Vector3(arc.toPos[0], arc.toPos[2], arc.toPos[1]);
      const sceneType = currentSceneGroup?.name || "local";
      const from = offsetFromPlanet(fromCenter, toCenter, arc.from, sceneType);
      const to = offsetFromPlanet(toCenter, fromCenter, arc.to, sceneType);
      const mid = arcControlPointLocal(from, to);

      const curve = new THREE.QuadraticBezierCurve3(from, mid, to);
      transferCurves.push({
        curve,
        startDay: t.startDay,
        endDay: t.endDay,
        episode: t.episode,
      });
    }
  }

  // Create ship marker — scale size based on scene type for visibility
  if (shipMarker3D) {
    currentSceneGroup.remove(shipMarker3D);
  }
  if (_shipLabel3D) {
    currentSceneGroup.remove(_shipLabel3D);
    if (_shipLabel3D.element?.parentNode) {
      _shipLabel3D.element.parentNode.removeChild(_shipLabel3D.element);
    }
  }
  const sceneType = currentSceneGroup?.name || "full-route";
  const isEpisode = sceneType.startsWith("episode-");
  const isLocal = sceneType !== "full-route" && !isEpisode;
  // Size ship relative to scene scale: full-route is far away, local is close
  // Local: 0.3 (between moon 0.08 and planet 0.5 for clear visibility)
  const shipRadius = isLocal ? 0.3 : isEpisode ? 0.8 : 0.4;
  const shipGeo = new THREE.SphereGeometry(shipRadius, 16, 16);
  // Use bright white MeshBasicMaterial so ship stands out against colored arcs
  const shipMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  shipMarker3D = new THREE.Mesh(shipGeo, shipMat);
  shipMarker3D.visible = false;
  currentSceneGroup.add(shipMarker3D);

  // Add CSS2D label above ship for identification
  const labelDiv = document.createElement("div");
  labelDiv.textContent = "▲ ケストレル";
  labelDiv.style.cssText = "color: #ffffff; font-size: 10px; text-shadow: 0 0 4px #000, 0 0 2px #000; pointer-events: none; white-space: nowrap;";
  _shipLabel3D = new CSS2DObject(labelDiv);
  _shipLabel3D.visible = false;
  currentSceneGroup.add(_shipLabel3D);
}

/** Map transfer to departure/arrival orbit using from/to planet fields */
function getOrbitForTransfer(timeline, transfer, isDeparture) {
  const planet = isDeparture ? transfer.from : transfer.to;
  if (!planet) return null;
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
        shipVisible = true;
        break;
      }
    }
    // If not on a transfer, check parking orbits
    if (!shipVisible && timelineData.parkingOrbits) {
      for (const po of timelineData.parkingOrbits) {
        if (timelineCurrentDay >= po.startDay && timelineCurrentDay <= po.endDay) {
          // Find the planet mesh to orbit around
          const planetMesh = planetMeshes[po.planet];
          if (planetMesh) {
            const elapsed = timelineCurrentDay - po.startDay;
            const angle = elapsed * po.angularVelocityPerDay;
            const px = planetMesh.position.x + po.radiusScene * Math.cos(angle);
            const py = planetMesh.position.y + po.radiusScene * 0.3 * Math.sin(angle * 0.7); // slight y wobble
            const pz = planetMesh.position.z + po.radiusScene * Math.sin(angle);
            shipMarker3D.position.set(px, py, pz);
            shipMarker3D.visible = true;
            shipVisible = true;
          }
          break;
        }
      }
    }
    if (!shipVisible) {
      shipMarker3D.visible = false;
    }
    // Sync ship label with marker
    if (_shipLabel3D) {
      _shipLabel3D.visible = shipVisible;
      if (shipVisible) {
        const r = shipMarker3D.geometry.parameters.radius || 0.4;
        _shipLabel3D.position.set(
          shipMarker3D.position.x,
          shipMarker3D.position.y + r + 0.5,
          shipMarker3D.position.z,
        );
      }
    }

    // Ship-frame camera: follow the ship
    if (_viewMode === "ship" && shipVisible) {
      const shipPos = shipMarker3D.position;
      controls.target.copy(shipPos);
      camera.position.set(
        shipPos.x + _cameraOffset.x,
        shipPos.y + _cameraOffset.y,
        shipPos.z + _cameraOffset.z,
      );
      controls.update();
    }
  }
}

/**
 * Set the view mode: "inertial" (fixed center) or "ship" (camera follows ship).
 */
export function setViewMode(mode) {
  _viewMode = mode;
  if (mode === "inertial") {
    // Reset camera to stored inertial position for this scene
    camera.position.copy(_inertialCameraPos);
    controls.target.copy(_inertialCameraTarget);
    controls.update();
  }
}

export function getViewMode() {
  return _viewMode;
}

/**
 * Set animation playback speed multiplier.
 * @param {number} speed - Speed multiplier (e.g. 0.5, 1, 2, 4)
 */
export function setAnimationSpeed(speed) {
  _animationSpeed = speed;
}

export function getAnimationSpeed() {
  return _animationSpeed;
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
      // Playback: complete mission in ~15 seconds at 1× speed
      const playbackRate = (timelineData.totalDays / 15) * _animationSpeed;
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

// ── Scenario visibility ──

/**
 * Toggle visibility of a scenario's objects (arcs, moons, labels).
 * @param {string} scenarioId
 * @param {boolean} visible
 */
export function setScenarioVisible(scenarioId, visible) {
  const objects = _scenarioObjects[scenarioId];
  if (!objects) return;
  for (const obj of objects) {
    obj.visible = visible;
  }
  if (visible) {
    _activeScenarios.add(scenarioId);
  } else {
    _activeScenarios.delete(scenarioId);
  }
}

export function getActiveScenarios() {
  return _activeScenarios;
}

// ── Info panel update ──

export function updateInfoPanel(panelEl, sceneData) {
  if (!panelEl) return;
  let html = `<h3>${sceneData.title}</h3>`;
  html += `<p>${sceneData.description}</p>`;

  if (sceneData.type === "full-route") {
    if (sceneData.transferSummary && sceneData.transferSummary.length > 0) {
      html += "<table>";
      html += "<tr><th>レグ</th><th>Z差 (AU)</th><th>傾斜ΔV比</th></tr>";
      for (const ts of sceneData.transferSummary) {
        const shortLeg = ts.leg.replace(/\s*[（(].*[）)]/, "");
        html += `<tr><td>${shortLeg}</td><td>${ts.outOfPlaneDistanceAU.toFixed(4)}</td><td>${ts.planeChangeFractionPercent.toFixed(2)}%</td></tr>`;
      }
      html += "</table>";
    }
  } else if (sceneData.type === "saturn-ring") {
    const arc = sceneData.transferArcs.find(a => a.approachAngleDeg !== undefined);
    if (arc?.approachAngleDeg) {
      html += `<p>接近角: <strong>${arc.approachAngleDeg.toFixed(1)}°</strong>（リング面に対して）</p>`;
    }
    if (sceneData.rings?.[0]) {
      const r = sceneData.rings[0];
      html += `<p>リング: ${(r.innerRadius / 1000).toFixed(0)}–${(r.outerRadius / 1000).toFixed(0)} ×10³ km</p>`;
    }
  } else if (sceneData.type === "uranus-approach") {
    for (const arc of sceneData.transferArcs) {
      if (arc.approachAngleDeg !== undefined && !arc.isCounterfactual) {
        html += `<p>${arc.label}: <strong>${arc.approachAngleDeg.toFixed(1)}°</strong></p>`;
      }
    }
    const eq = sceneData.planes?.find((p) => p.type === "equatorial");
    if (eq?.tiltDeg) {
      html += `<p>赤道面傾斜: <strong>${eq.tiltDeg}°</strong></p>`;
    }
  }

  // Scenario toggle buttons
  if (sceneData.scenarios && sceneData.scenarios.length > 0) {
    html += '<div class="scenario-toggles" style="margin-top:0.8em;border-top:1px solid #30363d;padding-top:0.6em;">';
    html += '<p style="font-size:0.8em;color:#8b949e;margin:0 0 0.4em;">シナリオ表示:</p>';
    for (const s of sceneData.scenarios) {
      const checked = _activeScenarios.has(s.id) ? "checked" : "";
      const color = s.color || (s.isCounterfactual ? "#8b949e" : "#3fb950");
      const labelStyle = s.isCounterfactual ? "font-style:italic;" : "font-weight:bold;";
      html += `<label style="display:block;margin:0.2em 0;font-size:0.85em;cursor:pointer;${labelStyle}">`;
      html += `<input type="checkbox" ${checked} data-scenario="${s.id}" style="margin-right:0.4em;">`;
      html += `<span style="color:${color};">●</span> ${s.label}`;
      html += `</label>`;
    }
    html += '</div>';
  }

  html += '<p style="font-size:0.75em;color:#6e7681;margin-top:1em;">惑星テクスチャ: <a href="https://www.solarsystemscope.com/textures/" target="_blank" rel="noopener" style="color:#58a6ff;">Solar System Scope</a> (CC BY 4.0)</p>';
  panelEl.innerHTML = html;

  // Wire up scenario toggle checkboxes
  const checkboxes = panelEl.querySelectorAll('input[data-scenario]');
  for (const cb of checkboxes) {
    cb.addEventListener("change", (e) => {
      setScenarioVisible(e.target.dataset.scenario, e.target.checked);
    });
  }
}
