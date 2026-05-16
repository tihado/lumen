import * as THREE from "./vendor/three.module.js";

const dataEl = document.getElementById("lesson-data");
const canvas = document.getElementById("solar-canvas");
const root = document.querySelector('[data-runtime="solar-system"]');

if (!(dataEl && canvas && root)) {
  throw new Error("Solar system runtime is missing required DOM nodes.");
}

const lesson = JSON.parse(dataEl.textContent || "{}");
const planets = Array.isArray(lesson.planets) ? lesson.planets : [];

const runtimeStyles = document.createElement("style");
runtimeStyles.textContent = `
  [data-runtime="solar-system"].scene-wrap {
    border-color: rgba(172, 190, 220, .18);
    border-radius: 8px;
    background:
      radial-gradient(circle at 48% 43%, rgba(255, 209, 102, .09), transparent 18rem),
      rgba(2, 6, 23, .72);
    box-shadow: 0 24px 80px rgba(0, 0, 0, .42), inset 0 1px 0 rgba(255,255,255,.06);
  }
  [data-runtime="solar-system"].scene-wrap::before {
    content: "";
    position: absolute;
    inset: 0;
    pointer-events: none;
    background:
      radial-gradient(circle at 50% 45%, transparent 0 36%, rgba(2, 6, 23, .2) 58%, rgba(2, 6, 23, .78) 100%),
      linear-gradient(120deg, rgba(103, 232, 249, .12), transparent 32%, rgba(251, 113, 133, .08));
  }
  [data-runtime="solar-system"] .toolbar {
    left: 26px;
    right: 26px;
    bottom: 24px;
    z-index: 2;
    gap: 10px;
  }
  [data-runtime="solar-system"] .hint {
    color: #e6f2ff;
    background: rgba(7, 13, 28, .72);
    border-color: rgba(168, 184, 214, .22);
    border-radius: 999px;
    padding: 9px 13px;
    box-shadow: inset 0 1px 0 rgba(255,255,255,.08);
    backdrop-filter: blur(12px);
  }
  aside {
    position: relative;
    overflow: hidden;
    border-color: rgba(172, 190, 220, .18);
    border-radius: 8px;
    background: linear-gradient(180deg, rgba(10, 20, 42, .84), rgba(5, 10, 23, .78));
    padding: 26px;
    box-shadow: 0 24px 80px rgba(0, 0, 0, .36), inset 0 1px 0 rgba(255,255,255,.07);
    backdrop-filter: blur(18px);
  }
  aside::before {
    content: "";
    position: absolute;
    top: -90px;
    right: -120px;
    width: 260px;
    height: 260px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(103, 232, 249, .18), transparent 62%);
    pointer-events: none;
  }
  .planet-title {
    font-size: clamp(32px, 4vw, 48px);
    line-height: 1;
  }
  .planet-description {
    color: #d5deed;
    font-size: 16px;
    line-height: 1.65;
    margin: 22px 0;
  }
  dl {
    gap: 10px 14px;
    padding: 16px 0;
    border-top: 1px solid rgba(172, 190, 220, .14);
    border-bottom: 1px solid rgba(172, 190, 220, .14);
  }
  dd {
    color: #edf5ff;
    font-weight: 760;
  }
  li::marker {
    color: #67e8f9;
  }
  .planet-list {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 9px;
    margin-top: 22px;
  }
  button {
    border-radius: 6px;
    background: linear-gradient(180deg, rgba(255,255,255,.1), rgba(255,255,255,.045));
    font-weight: 760;
    transition: transform .18s ease, border-color .18s ease, background .18s ease, color .18s ease;
  }
  button:hover,
  button.active {
    border-color: rgba(255, 209, 102, .86);
    color: #fff6d8;
    background: linear-gradient(180deg, rgba(255, 209, 102, .2), rgba(103, 232, 249, .08));
    transform: translateY(-1px);
  }
  @media (max-width: 860px) {
    .planet-list {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }
  }
  @media (max-width: 560px) {
    [data-runtime="solar-system"] .toolbar {
      left: 18px;
      right: 18px;
      bottom: 18px;
    }
    .planet-list {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    aside {
      padding: 22px;
    }
  }
`;
document.head.appendChild(runtimeStyles);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true,
  canvas,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.18;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 200);
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

const ambient = new THREE.AmbientLight(0x8a_a4_d6, 0.82);
scene.add(ambient);

const rimLight = new THREE.DirectionalLight(0x67_e8_f9, 1.2);
rimLight.position.set(-14, 18, -10);
scene.add(rimLight);

const sunLight = new THREE.PointLight(0xff_d1_66, 12, 140);
scene.add(sunLight);

const sun = new THREE.Mesh(
  new THREE.SphereGeometry(1.8, 48, 48),
  new THREE.MeshBasicMaterial({ color: 0xff_c8_57, toneMapped: false })
);
scene.add(sun);

const sunGlow = new THREE.Mesh(
  new THREE.SphereGeometry(2.15, 48, 48),
  new THREE.MeshBasicMaterial({
    color: 0xff_b7_03,
    transparent: true,
    opacity: 0.22,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  })
);
scene.add(sunGlow);

const outerSunGlow = new THREE.Mesh(
  new THREE.SphereGeometry(2.75, 64, 64),
  new THREE.MeshBasicMaterial({
    color: 0xff_7a_18,
    transparent: true,
    opacity: 0.08,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  })
);
scene.add(outerSunGlow);

const starGeometry = new THREE.BufferGeometry();
const starPositions = [];
const starColors = [];
const starSizes = [];
for (let i = 0; i < 900; i += 1) {
  const radius = 55 + Math.random() * 45;
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  starPositions.push(
    radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
  const warm = Math.random();
  starColors.push(
    warm > 0.82 ? 1 : 0.7 + Math.random() * 0.24,
    warm > 0.82 ? 0.72 + Math.random() * 0.18 : 0.84 + Math.random() * 0.12,
    0.9 + Math.random() * 0.1
  );
  starSizes.push(0.035 + Math.random() * 0.095);
}
starGeometry.setAttribute(
  "position",
  new THREE.Float32BufferAttribute(starPositions, 3)
);
starGeometry.setAttribute(
  "color",
  new THREE.Float32BufferAttribute(starColors, 3)
);
starGeometry.setAttribute("size", new THREE.Float32BufferAttribute(starSizes, 1));
scene.add(
  new THREE.Points(
    starGeometry,
    new THREE.PointsMaterial({
      color: 0xff_ff_ff,
      size: 0.075,
      transparent: true,
      opacity: 0.82,
      vertexColors: true,
      depthWrite: false,
    })
  )
);

const planetMeshes = new Map();
const clickable = [];
const orbitLines = [];

const selectedRing = new THREE.Mesh(
  new THREE.TorusGeometry(1, 0.025, 12, 128),
  new THREE.MeshBasicMaterial({
    color: 0x67_e8_f9,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
);
selectedRing.rotation.x = Math.PI / 2;
scene.add(selectedRing);

function seededRandom(seed) {
  let value = 2166136261;
  for (const char of seed) {
    value ^= char.charCodeAt(0);
    value = Math.imul(value, 16777619);
  }
  return () => {
    value = Math.imul(value ^ (value >>> 15), 2246822507);
    value = Math.imul(value ^ (value >>> 13), 3266489909);
    value ^= value >>> 16;
    return (value >>> 0) / 4294967296;
  };
}

function colorWithLightness(hex, amount) {
  const color = new THREE.Color(hex);
  color.offsetHSL(0, 0, amount);
  return `#${color.getHexString()}`;
}

function addSoftTextureGrain(context, random, color, count, alpha) {
  context.fillStyle = color;
  for (let i = 0; i < count; i += 1) {
    context.globalAlpha = alpha * (0.35 + random() * 0.65);
    context.beginPath();
    context.arc(random() * 512, random() * 256, 0.5 + random() * 1.8, 0, Math.PI * 2);
    context.fill();
  }
  context.globalAlpha = 1;
}

function drawWavyBand(context, random, y, height, color, alpha) {
  context.globalAlpha = alpha;
  context.fillStyle = color;
  context.beginPath();
  context.moveTo(0, y);
  for (let x = 0; x <= 512; x += 32) {
    context.lineTo(x, y + Math.sin(x * 0.035 + random() * 3) * height * 0.22);
  }
  for (let x = 512; x >= 0; x -= 32) {
    context.lineTo(
      x,
      y + height + Math.cos(x * 0.028 + random() * 3) * height * 0.24
    );
  }
  context.closePath();
  context.fill();
  context.globalAlpha = 1;
}

function drawLandMass(context, random, centerX, centerY, radiusX, radiusY) {
  context.beginPath();
  for (let i = 0; i <= 28; i += 1) {
    const angle = (i / 28) * Math.PI * 2;
    const wobble = 0.68 + random() * 0.55;
    const x = centerX + Math.cos(angle) * radiusX * wobble;
    const y = centerY + Math.sin(angle) * radiusY * wobble;
    if (i === 0) {
      context.moveTo(x, y);
    } else {
      context.lineTo(x, y);
    }
  }
  context.closePath();
  context.fill();
}

function createPlanetTexture(planet) {
  const random = seededRandom(`surface-${planet.id}`);
  const canvasEl = document.createElement("canvas");
  canvasEl.width = 512;
  canvasEl.height = 256;
  const context = canvasEl.getContext("2d");
  const base = planet.color;
  const gradient = context.createLinearGradient(0, 0, 512, 256);
  gradient.addColorStop(0, colorWithLightness(base, 0.16));
  gradient.addColorStop(0.5, base);
  gradient.addColorStop(1, colorWithLightness(base, -0.18));
  context.fillStyle = gradient;
  context.fillRect(0, 0, 512, 256);

  if (planet.id === "earth") {
    context.fillStyle = "#2f87c9";
    context.fillRect(0, 0, 512, 256);
    context.fillStyle = "#2f7d51";
    for (let i = 0; i < 13; i += 1) {
      drawLandMass(
        context,
        random,
        random() * 512,
        34 + random() * 176,
        18 + random() * 58,
        10 + random() * 32
      );
    }
    context.fillStyle = "rgba(229, 241, 255, .76)";
    context.fillRect(0, 0, 512, 12);
    context.fillRect(0, 244, 512, 12);
    addSoftTextureGrain(context, random, "#b8e2ff", 180, 0.18);
  } else if (planet.id === "jupiter" || planet.id === "saturn") {
    const palette =
      planet.id === "jupiter"
        ? ["#f4d3a0", "#b76f43", "#fff1c9", "#8d5b3d", "#d9a36b"]
        : ["#efdca3", "#b99b62", "#fff1bd", "#8f7650", "#d7bd7d"];
    for (let y = -6; y < 256; y += 16 + random() * 12) {
      drawWavyBand(
        context,
        random,
        y,
        10 + random() * 14,
        palette[Math.floor(random() * palette.length)],
        0.42 + random() * 0.28
      );
    }
    if (planet.id === "jupiter") {
      context.globalAlpha = 0.78;
      context.fillStyle = "#b84c35";
      context.beginPath();
      context.ellipse(365, 150, 40, 18, -0.12, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = "rgba(255, 238, 199, .72)";
      context.lineWidth = 4;
      context.stroke();
      context.globalAlpha = 1;
    }
    addSoftTextureGrain(context, random, "#fff8dc", 220, 0.1);
  } else if (planet.id === "uranus" || planet.id === "neptune") {
    const pale = planet.id === "uranus" ? "#b9f3ff" : "#5d8dff";
    for (let y = 12; y < 256; y += 28) {
      drawWavyBand(context, random, y, 7 + random() * 8, pale, 0.16);
    }
    if (planet.id === "neptune") {
      context.fillStyle = "rgba(12, 31, 103, .46)";
      context.beginPath();
      context.ellipse(348, 114, 28, 12, 0.2, 0, Math.PI * 2);
      context.fill();
    }
    addSoftTextureGrain(context, random, "#e8fbff", 160, 0.08);
  } else {
    if (planet.id === "venus") {
      for (let y = 0; y < 256; y += 18) {
        drawWavyBand(context, random, y, 14, "#ffe3a4", 0.22);
        drawWavyBand(context, random, y + 8, 10, "#a56d3e", 0.12);
      }
    }
    if (planet.id === "mars") {
      drawWavyBand(context, random, 72, 24, "#8e3f28", 0.26);
      drawWavyBand(context, random, 150, 30, "#f1a05f", 0.22);
      context.fillStyle = "rgba(255, 235, 215, .64)";
      context.fillRect(0, 0, 512, 9);
      context.fillRect(0, 247, 512, 9);
    }
    for (let i = 0; i < (planet.id === "mercury" ? 90 : 52); i += 1) {
      const x = random() * 512;
      const y = random() * 256;
      const radius = 2 + random() * (planet.id === "mars" ? 8 : 11);
      context.globalAlpha = 0.22 + random() * 0.24;
      context.fillStyle = "#0f172a";
      context.beginPath();
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.fill();
      context.globalAlpha = 0.28;
      context.strokeStyle = "#fff2d0";
      context.lineWidth = Math.max(1, radius * 0.14);
      context.beginPath();
      context.arc(x - radius * 0.12, y - radius * 0.15, radius * 0.78, 0, Math.PI * 2);
      context.stroke();
    }
    context.globalAlpha = 1;
    addSoftTextureGrain(context, random, "#fff7e6", 180, 0.08);
  }

  const texture = new THREE.CanvasTexture(canvasEl);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

function createCloudTexture(seed, opacity) {
  const random = seededRandom(`cloud-${seed}`);
  const canvasEl = document.createElement("canvas");
  canvasEl.width = 512;
  canvasEl.height = 256;
  const context = canvasEl.getContext("2d");
  context.clearRect(0, 0, 512, 256);
  context.fillStyle = "rgba(255, 255, 255, .84)";
  for (let i = 0; i < 46; i += 1) {
    const x = random() * 512;
    const y = 20 + random() * 216;
    context.globalAlpha = opacity * (0.25 + random() * 0.55);
    context.beginPath();
    context.ellipse(
      x,
      y,
      14 + random() * 42,
      2 + random() * 8,
      (random() - 0.5) * 0.4,
      0,
      Math.PI * 2
    );
    context.fill();
  }
  context.globalAlpha = 1;
  const texture = new THREE.CanvasTexture(canvasEl);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  return texture;
}

for (const planet of planets) {
  const orbit = new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints(
      Array.from({ length: 160 }, (_, i) => {
        const angle = (i / 160) * Math.PI * 2;
        return new THREE.Vector3(
          Math.cos(angle) * planet.orbitRadius,
          0,
          Math.sin(angle) * planet.orbitRadius
        );
      })
    ),
    new THREE.LineBasicMaterial({
      color: 0x9f_b5_d1,
      transparent: true,
      opacity: 0.19,
    })
  );
  scene.add(orbit);
  orbitLines.push(orbit);

  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(planet.radius, 52, 52),
    new THREE.MeshStandardMaterial({
      color: 0xff_ff_ff,
      emissive: new THREE.Color(planet.color).multiplyScalar(0.08),
      map: createPlanetTexture(planet),
      roughness: 0.58,
      metalness: 0.08,
    })
  );
  mesh.userData.planetId = planet.id;
  mesh.userData.angle = Math.random() * Math.PI * 2;
  mesh.userData.planet = planet;
  scene.add(mesh);
  planetMeshes.set(planet.id, mesh);
  clickable.push(mesh);

  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(planet.radius * 1.08, 36, 36),
    new THREE.MeshBasicMaterial({
      color: new THREE.Color(planet.color),
      transparent: true,
      opacity: 0.1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  mesh.add(halo);
  mesh.userData.halo = halo;

  if (["earth", "venus", "jupiter", "saturn", "uranus", "neptune"].includes(planet.id)) {
    const cloudLayer = new THREE.Mesh(
      new THREE.SphereGeometry(planet.radius * 1.025, 40, 40),
      new THREE.MeshBasicMaterial({
        map: createCloudTexture(planet.id, planet.id === "earth" ? 0.5 : 0.28),
        transparent: true,
        opacity: planet.id === "earth" ? 0.58 : 0.26,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    mesh.add(cloudLayer);
    mesh.userData.cloudLayer = cloudLayer;
  }

  if (planet.id === "saturn") {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(planet.radius * 1.55, 0.045, 12, 96),
      new THREE.MeshBasicMaterial({
        color: 0xf8_e3_a2,
        transparent: true,
        opacity: 0.78,
        side: THREE.DoubleSide,
      })
    );
    ring.rotation.x = Math.PI / 2.8;
    mesh.add(ring);
  }
}

let selectedId = null;
let distance = 34;
let theta = -0.85;
let phi = 1.04;
const target = new THREE.Vector3(0, 0, 0);
const desiredTarget = new THREE.Vector3(0, 0, 0);

const nameEl = document.getElementById("planet-name");
const descriptionEl = document.getElementById("planet-description");
const diameterEl = document.getElementById("planet-diameter");
const distanceEl = document.getElementById("planet-distance");
const periodEl = document.getElementById("planet-period");
const factsEl = document.getElementById("planet-facts");
const listEl = document.getElementById("planet-list");
const resetBtn = document.getElementById("reset-view");

function setActiveButton() {
  for (const button of listEl?.querySelectorAll("button") || []) {
    button.classList.toggle("active", button.dataset.planetId === selectedId);
  }
}

function selectPlanet(id) {
  selectedId = id;
  const planet = planets.find((item) => item.id === id);
  const mesh = planetMeshes.get(id);
  if (!(planet && mesh)) {
    return;
  }
  distance = Math.max(planet.radius * 7, 7);
  selectedRing.material.opacity = 0.78;
  selectedRing.scale.setScalar(planet.radius * 1.75);
  if (nameEl) {
    nameEl.textContent = planet.name;
  }
  if (descriptionEl) {
    descriptionEl.textContent = planet.description;
  }
  if (diameterEl) {
    diameterEl.textContent = planet.diameter;
  }
  if (distanceEl) {
    distanceEl.textContent = planet.distanceFromSun;
  }
  if (periodEl) {
    periodEl.textContent = planet.orbitalPeriod;
  }
  if (factsEl) {
    factsEl.innerHTML = "";
    for (const fact of planet.facts || []) {
      const li = document.createElement("li");
      li.textContent = fact;
      factsEl.appendChild(li);
    }
  }
  desiredTarget.copy(mesh.position);
  setActiveButton();
}

function resetView() {
  selectedId = null;
  distance = 34;
  desiredTarget.set(0, 0, 0);
  selectedRing.material.opacity = 0;
  if (nameEl) {
    nameEl.textContent = "Overview";
  }
  if (descriptionEl) {
    descriptionEl.textContent =
      "Click a planet to zoom in and read detailed information.";
  }
  if (diameterEl) {
    diameterEl.textContent = "—";
  }
  if (distanceEl) {
    distanceEl.textContent = "—";
  }
  if (periodEl) {
    periodEl.textContent = "—";
  }
  if (factsEl) {
    factsEl.innerHTML =
      "<li>The solar system includes the Sun, eight planets, and many smaller bodies.</li>";
  }
  setActiveButton();
}

if (listEl) {
  for (const planet of planets) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.planetId = planet.id;
    button.textContent = planet.name;
    button.addEventListener("click", () => selectPlanet(planet.id));
    listEl.appendChild(button);
  }
}

resetBtn?.addEventListener("click", resetView);

let dragging = false;
let lastX = 0;
let lastY = 0;

canvas.addEventListener("pointerdown", (event) => {
  dragging = true;
  lastX = event.clientX;
  lastY = event.clientY;
  canvas.setPointerCapture(event.pointerId);
});

canvas.addEventListener("pointermove", (event) => {
  if (!dragging) {
    return;
  }
  const dx = event.clientX - lastX;
  const dy = event.clientY - lastY;
  lastX = event.clientX;
  lastY = event.clientY;
  theta -= dx * 0.006;
  phi = Math.max(0.25, Math.min(Math.PI - 0.25, phi + dy * 0.006));
});

canvas.addEventListener("pointerup", (event) => {
  dragging = false;
  canvas.releasePointerCapture(event.pointerId);
});

canvas.addEventListener("wheel", (event) => {
  event.preventDefault();
  distance = Math.max(4, Math.min(60, distance + event.deltaY * 0.025));
});

canvas.addEventListener("click", (event) => {
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects(clickable, false)[0];
  if (hit?.object?.userData?.planetId) {
    selectPlanet(hit.object.userData.planetId);
  }
});

function resize() {
  const rect = root.getBoundingClientRect();
  const width = Math.max(320, Math.floor(rect.width));
  const height = Math.max(420, Math.floor(rect.height));
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function updateCamera() {
  target.lerp(desiredTarget, 0.07);
  const sinPhi = Math.sin(phi);
  camera.position.set(
    target.x + distance * sinPhi * Math.cos(theta),
    target.y + distance * Math.cos(phi),
    target.z + distance * sinPhi * Math.sin(theta)
  );
  camera.lookAt(target);
}

let lastTime = 0;
function animate(time) {
  const dt = Math.min(32, time - lastTime || 16);
  lastTime = time;

  sun.rotation.y += 0.0015 * dt;
  sunGlow.rotation.y -= 0.001 * dt;
  outerSunGlow.rotation.y += 0.0007 * dt;
  sunGlow.scale.setScalar(1 + Math.sin(time * 0.0018) * 0.018);
  outerSunGlow.scale.setScalar(1 + Math.cos(time * 0.0012) * 0.028);

  for (const [index, orbit] of orbitLines.entries()) {
    orbit.material.opacity = 0.13 + Math.sin(time * 0.0007 + index) * 0.035;
  }

  for (const mesh of clickable) {
    const planet = mesh.userData.planet;
    mesh.userData.angle += planet.orbitSpeed * (dt / 16);
    mesh.position.set(
      Math.cos(mesh.userData.angle) * planet.orbitRadius,
      0,
      Math.sin(mesh.userData.angle) * planet.orbitRadius
    );
    mesh.rotation.y += 0.006 * (dt / 16);
    if (mesh.userData.halo?.material) {
      mesh.userData.halo.material.opacity =
        0.075 + Math.sin(time * 0.0015 + planet.orbitRadius) * 0.025;
    }
    if (mesh.userData.cloudLayer) {
      mesh.userData.cloudLayer.rotation.y += 0.0025 * (dt / 16);
    }
  }

  if (selectedId) {
    const selected = planetMeshes.get(selectedId);
    if (selected) {
      desiredTarget.copy(selected.position);
      selectedRing.position.copy(selected.position);
      selectedRing.lookAt(camera.position);
      selectedRing.rotation.z += 0.01 * (dt / 16);
    }
  }

  updateCamera();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

resize();
resetView();
window.addEventListener("resize", resize);
requestAnimationFrame(animate);
