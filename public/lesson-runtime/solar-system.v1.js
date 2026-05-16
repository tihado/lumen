import * as THREE from "./vendor/three.module.js";

const dataEl = document.getElementById("lesson-data");
const canvas = document.getElementById("solar-canvas");
const root = document.querySelector('[data-runtime="solar-system"]');

if (!(dataEl && canvas && root)) {
  throw new Error("Solar system runtime is missing required DOM nodes.");
}

const lesson = JSON.parse(dataEl.textContent || "{}");
const planets = Array.isArray(lesson.planets) ? lesson.planets : [];

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true,
  canvas,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 200);
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

const ambient = new THREE.AmbientLight(0x8a_a4_d6, 1.2);
scene.add(ambient);

const sunLight = new THREE.PointLight(0xff_d1_66, 8, 120);
scene.add(sunLight);

const sun = new THREE.Mesh(
  new THREE.SphereGeometry(1.8, 48, 48),
  new THREE.MeshBasicMaterial({ color: 0xff_c8_57 })
);
scene.add(sun);

const sunGlow = new THREE.Mesh(
  new THREE.SphereGeometry(2.15, 48, 48),
  new THREE.MeshBasicMaterial({
    color: 0xff_b7_03,
    transparent: true,
    opacity: 0.18,
  })
);
scene.add(sunGlow);

const starGeometry = new THREE.BufferGeometry();
const starPositions = [];
for (let i = 0; i < 900; i += 1) {
  const radius = 55 + Math.random() * 45;
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  starPositions.push(
    radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}
starGeometry.setAttribute(
  "position",
  new THREE.Float32BufferAttribute(starPositions, 3)
);
scene.add(
  new THREE.Points(
    starGeometry,
    new THREE.PointsMaterial({ color: 0xdb_ea_fe, size: 0.08 })
  )
);

const planetMeshes = new Map();
const clickable = [];

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
      color: 0x93_a4_bd,
      transparent: true,
      opacity: 0.16,
    })
  );
  scene.add(orbit);

  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(planet.radius, 36, 36),
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(planet.color),
      roughness: 0.72,
      metalness: 0.05,
    })
  );
  mesh.userData.planetId = planet.id;
  mesh.userData.angle = Math.random() * Math.PI * 2;
  mesh.userData.planet = planet;
  scene.add(mesh);
  planetMeshes.set(planet.id, mesh);
  clickable.push(mesh);

  if (planet.id === "saturn") {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(planet.radius * 1.55, 0.045, 12, 96),
      new THREE.MeshBasicMaterial({
        color: 0xf8_e3_a2,
        transparent: true,
        opacity: 0.72,
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

  for (const mesh of clickable) {
    const planet = mesh.userData.planet;
    mesh.userData.angle += planet.orbitSpeed * (dt / 16);
    mesh.position.set(
      Math.cos(mesh.userData.angle) * planet.orbitRadius,
      0,
      Math.sin(mesh.userData.angle) * planet.orbitRadius
    );
    mesh.rotation.y += 0.006 * (dt / 16);
  }

  if (selectedId) {
    const selected = planetMeshes.get(selectedId);
    if (selected) {
      desiredTarget.copy(selected.position);
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
