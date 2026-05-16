import * as THREE from "./vendor/three.module.js";

const dataEl = document.getElementById("lesson-data");
const canvas = document.getElementById("solar-canvas");
const root = document.querySelector('[data-runtime="solar-system"]');

if (!(dataEl && canvas && root)) {
  throw new Error("Solar system runtime is missing required DOM nodes.");
}

const lesson = JSON.parse(dataEl.textContent || "{}");
const planetGravityDefaults = {
  mercury: {
    surfaceGravity: "3.7 m/s²",
    gravityComparedToEarth: "0.38 x Earth",
    gravityNote:
      "Mercury is small, so you would weigh much less there even though it is dense for its size.",
    extraFact:
      "Sunrise on Mercury can appear to stop, reverse, and rise again because of its slow spin and fast orbit.",
  },
  venus: {
    surfaceGravity: "8.87 m/s²",
    gravityComparedToEarth: "0.90 x Earth",
    gravityNote:
      "Venus is almost Earth's twin in size, so its surface gravity feels surprisingly familiar.",
    extraFact: "One day on Venus is longer than one Venus year.",
  },
  earth: {
    surfaceGravity: "9.81 m/s²",
    gravityComparedToEarth: "1.00 x Earth",
    gravityNote:
      "Earth is our reference point: one Earth gravity is the pull your body is adapted to every day.",
    extraFact:
      "Earth's gravity helps hold the atmosphere and oceans that make life possible.",
  },
  mars: {
    surfaceGravity: "3.71 m/s²",
    gravityComparedToEarth: "0.38 x Earth",
    gravityNote:
      "Mars gravity is close to Mercury's, so jumping and carrying objects would feel much easier than on Earth.",
    extraFact:
      "Mars has two tiny moons, Phobos and Deimos, that may be captured asteroids.",
  },
  jupiter: {
    surfaceGravity: "24.79 m/s²",
    gravityComparedToEarth: "2.53 x Earth",
    gravityNote:
      "Jupiter's gravity is enormous because it is so massive, even though its visible surface is really cloud tops.",
    extraFact:
      "Its magnetic field is the strongest of any planet in the solar system.",
  },
  saturn: {
    surfaceGravity: "10.44 m/s²",
    gravityComparedToEarth: "1.06 x Earth",
    gravityNote:
      "Saturn is huge but low-density, so gravity near its cloud tops is only a little stronger than Earth's.",
    extraFact: "Its rings are wide but extremely thin compared with the planet.",
  },
  uranus: {
    surfaceGravity: "8.69 m/s²",
    gravityComparedToEarth: "0.89 x Earth",
    gravityNote:
      "Uranus is larger than Earth, but its lower density keeps surface gravity slightly weaker than ours.",
    extraFact: "Uranus was the first planet discovered with a telescope.",
  },
  neptune: {
    surfaceGravity: "11.15 m/s²",
    gravityComparedToEarth: "1.14 x Earth",
    gravityNote:
      "Neptune is an ice giant with a strong pull, but it is still far gentler than Jupiter.",
    extraFact: "Neptune was predicted mathematically before it was directly observed.",
  },
};

const planets = Array.isArray(lesson.planets)
  ? lesson.planets.map((planet) => {
      const defaults = planetGravityDefaults[planet.id] || {};
      const facts = Array.isArray(planet.facts) ? [...planet.facts] : [];
      if (defaults.extraFact && !facts.includes(defaults.extraFact)) {
        facts.push(defaults.extraFact);
      }
      return {
        ...planet,
        surfaceGravity: planet.surfaceGravity || defaults.surfaceGravity,
        gravityComparedToEarth:
          planet.gravityComparedToEarth || defaults.gravityComparedToEarth,
        gravityNote: planet.gravityNote || defaults.gravityNote,
        facts,
      };
    })
  : [];
const sunInfo = {
  id: "sun",
  name: "Sun",
  radius: 1.8,
  description:
    "The star at the center of the solar system. Its gravity holds the planets in orbit, and its energy powers weather, climate, and most life on Earth.",
  facts: [
    "The Sun contains about 99.8% of all mass in the solar system.",
    "Light from the Sun takes about 8 minutes and 20 seconds to reach Earth.",
    "Its core turns hydrogen into helium through nuclear fusion.",
  ],
  diameter: "1.39 million km",
  distanceFromSun: "Center of the system",
  orbitalPeriod: "About 25-35 days rotation",
  surfaceGravity: "274 m/s²",
  gravityComparedToEarth: "28 x Earth",
  gravityNote:
    "The Sun's gravity dominates the whole solar system; without it, the planets would not stay in orbit.",
};
const defaultSolarQuizItems = [
  {
    question: "Which planet is currently known to support life?",
    choices: ["Venus", "Earth", "Neptune"],
    answer: "Earth",
    explanation:
      "Earth is the right answer because it has stable liquid water, a protective atmosphere, and ecosystems we can directly observe.",
    funFact:
      "Earth is the only world we know with rain, oceans, clouds, and living things all moving through the same water cycle.",
  },
  {
    question: "What does a planet orbit in our solar system?",
    choices: ["The Sun", "A comet", "Earth's Moon"],
    answer: "The Sun",
    explanation:
      "Planets in the solar system orbit the Sun because the Sun contains almost all of the system's mass and has the strongest gravitational pull.",
    funFact:
      "The Sun holds about 99.8% of the mass in the solar system, so everything else is tiny by comparison.",
  },
  {
    question: "Which force helps keep planets moving in orbit?",
    choices: ["Gravity", "Sound", "Friction"],
    answer: "Gravity",
    explanation:
      "Gravity pulls each planet toward the Sun while the planet's forward motion keeps it from falling straight in.",
    funFact:
      "An orbit is a kind of continuous fall: the planet keeps falling around the Sun instead of into it.",
  },
];

const runtimeStyles = document.createElement("style");
runtimeStyles.textContent = `
  [data-runtime="solar-system"].scene-wrap {
    isolation: isolate;
    border-color: rgba(172, 190, 220, .18);
    border-radius: 8px;
    background-color: rgba(2, 6, 23, .72);
    background-image:
      radial-gradient(circle at 48% 43%, rgba(255, 209, 102, .09), transparent 18rem);
    box-shadow: 0 24px 80px rgba(0, 0, 0, .42), inset 0 1px 0 rgba(255,255,255,.06);
  }
  [data-runtime="solar-system"].scene-wrap::before {
    content: "";
    position: absolute;
    inset: 0;
    z-index: 0;
    pointer-events: none;
    background:
      radial-gradient(circle at 6% 14%, rgba(255,255,255,.95) 0 1px, transparent 1.8px),
      radial-gradient(circle at 13% 67%, rgba(191,219,254,.7) 0 .9px, transparent 1.7px),
      radial-gradient(circle at 18% 31%, rgba(255,244,214,.9) 0 1.2px, transparent 2px),
      radial-gradient(circle at 24% 83%, rgba(255,255,255,.62) 0 .8px, transparent 1.5px),
      radial-gradient(circle at 31% 18%, rgba(191,219,254,.8) 0 1px, transparent 1.9px),
      radial-gradient(circle at 37% 72%, rgba(255,255,255,.86) 0 1.1px, transparent 2px),
      radial-gradient(circle at 42% 9%, rgba(255,244,214,.72) 0 .8px, transparent 1.6px),
      radial-gradient(circle at 49% 58%, rgba(191,219,254,.55) 0 .7px, transparent 1.4px),
      radial-gradient(circle at 54% 22%, rgba(255,255,255,.88) 0 1px, transparent 1.8px),
      radial-gradient(circle at 61% 88%, rgba(255,244,214,.8) 0 1.2px, transparent 2.1px),
      radial-gradient(circle at 68% 13%, rgba(191,219,254,.66) 0 .9px, transparent 1.7px),
      radial-gradient(circle at 73% 48%, rgba(255,255,255,.92) 0 1px, transparent 1.9px),
      radial-gradient(circle at 79% 76%, rgba(191,219,254,.72) 0 .8px, transparent 1.6px),
      radial-gradient(circle at 86% 27%, rgba(255,244,214,.86) 0 1.1px, transparent 2px),
      radial-gradient(circle at 92% 63%, rgba(255,255,255,.68) 0 .8px, transparent 1.5px),
      radial-gradient(circle at 97% 8%, rgba(191,219,254,.78) 0 1px, transparent 1.8px),
      radial-gradient(circle at 50% 45%, transparent 0 36%, rgba(2, 6, 23, .2) 58%, rgba(2, 6, 23, .78) 100%),
      linear-gradient(120deg, rgba(103, 232, 249, .12), transparent 32%, rgba(251, 113, 133, .08));
    opacity: .82;
    filter: drop-shadow(0 0 5px rgba(255,255,255,.3));
    animation: solar-stars-twinkle 4.8s ease-in-out infinite alternate;
  }
  #solar-canvas {
    position: relative;
    z-index: 1;
  }
  @keyframes solar-stars-twinkle {
    0%, 100% {
      opacity: .58;
      filter: brightness(.86) drop-shadow(0 0 2px rgba(255,255,255,.16));
    }
    45% {
      opacity: .94;
      filter: brightness(1.34) drop-shadow(0 0 7px rgba(191,219,254,.4));
    }
    72% {
      opacity: .72;
      filter: brightness(1.05) drop-shadow(0 0 4px rgba(255,244,214,.28));
    }
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
  [data-runtime="solar-system"] .planet-popover {
    position: absolute;
    left: 0;
    top: 0;
    z-index: 4;
    width: min(310px, calc(100% - 28px));
    border: 1px solid rgba(255, 209, 102, .38);
    border-radius: 8px;
    background:
      linear-gradient(180deg, rgba(13, 25, 51, .94), rgba(4, 10, 25, .92));
    box-shadow: 0 18px 46px rgba(0, 0, 0, .42), inset 0 1px 0 rgba(255,255,255,.09);
    color: #f8fafc;
    opacity: 0;
    pointer-events: none;
    transform: translate3d(var(--popup-x, 0), var(--popup-y, 0), 0) scale(.96);
    transform-origin: var(--origin-x, 50%) var(--origin-y, 100%);
    transition: opacity .18s ease, transform .18s ease;
    backdrop-filter: blur(16px);
  }
  [data-runtime="solar-system"] .planet-popover[data-open="true"] {
    opacity: 1;
    pointer-events: auto;
    transform: translate3d(var(--popup-x, 0), var(--popup-y, 0), 0) scale(1);
  }
  [data-runtime="solar-system"] .planet-popover[data-side="below"] {
    transform-origin: var(--origin-x, 50%) 0%;
  }
  [data-runtime="solar-system"] .planet-popover-arrow {
    position: absolute;
    left: var(--arrow-x, 50%);
    top: 100%;
    width: 14px;
    height: 14px;
    border-right: 1px solid rgba(255, 209, 102, .38);
    border-bottom: 1px solid rgba(255, 209, 102, .38);
    background: rgba(4, 10, 25, .94);
    transform: translate(-50%, -50%) rotate(45deg);
  }
  [data-runtime="solar-system"] .planet-popover[data-side="below"] .planet-popover-arrow {
    top: 0;
    border: 0;
    border-left: 1px solid rgba(255, 209, 102, .38);
    border-top: 1px solid rgba(255, 209, 102, .38);
    background: rgba(13, 25, 51, .94);
  }
  [data-runtime="solar-system"] .planet-popover-body {
    position: relative;
    z-index: 1;
    display: grid;
    gap: 10px;
    padding: 15px 16px 16px;
  }
  [data-runtime="solar-system"] .planet-popover-kicker {
    color: #ffd166;
    font-size: 10px;
    font-weight: 850;
    letter-spacing: .16em;
    text-transform: uppercase;
  }
  [data-runtime="solar-system"] .planet-popover-title {
    margin: 0;
    padding-right: 24px;
    font-size: 24px;
    line-height: 1;
  }
  [data-runtime="solar-system"] .planet-popover-description {
    margin: 0;
    color: #dbeafe;
    font-size: 13px;
    line-height: 1.55;
  }
  [data-runtime="solar-system"] .planet-popover-meta {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 7px 12px;
    padding-top: 9px;
    border-top: 1px solid rgba(172, 190, 220, .16);
    font-size: 11px;
  }
  [data-runtime="solar-system"] .planet-popover-gravity {
    margin: 0;
    color: #ffe8a3;
    font-size: 12px;
    line-height: 1.45;
  }
  [data-runtime="solar-system"] .planet-popover-meta span:nth-child(odd) {
    color: #a9b5c8;
  }
  [data-runtime="solar-system"] .planet-popover-meta span:nth-child(even) {
    color: #edf5ff;
    font-weight: 760;
    text-align: right;
  }
  [data-runtime="solar-system"] .planet-popover-close {
    position: absolute;
    top: 9px;
    right: 9px;
    display: grid;
    width: 26px;
    height: 26px;
    place-items: center;
    padding: 0;
    border-color: rgba(255, 255, 255, .16);
    border-radius: 999px;
    line-height: 1;
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
  .gravity-panel {
    display: grid;
    gap: 8px;
    margin: -2px 0 22px;
    padding: 14px;
    border: 1px solid rgba(103, 232, 249, .2);
    border-radius: 8px;
    background: linear-gradient(135deg, rgba(103, 232, 249, .1), rgba(255, 209, 102, .06));
  }
  .gravity-panel strong {
    color: #f8fafc;
  }
  .gravity-panel p {
    margin: 0;
    color: #dbeafe;
    font-size: 13px;
    line-height: 1.55;
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
  [data-solar-quiz] {
    border-color: rgba(172, 190, 220, .18);
    border-radius: 8px;
    background: rgba(15, 23, 42, .72);
    padding: 20px;
  }
  [data-solar-quiz] h2 {
    margin: 10px 0 8px;
  }
  [data-solar-quiz] .summary {
    max-width: 760px;
    margin: 0;
    color: #d5deed;
    line-height: 1.6;
  }
  .quiz-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 14px;
    margin-top: 16px;
  }
  .quiz-question {
    display: grid;
    align-content: start;
    gap: 12px;
    min-height: 100%;
    border: 1px solid rgba(172, 190, 220, .16);
    border-radius: 8px;
    background: linear-gradient(180deg, rgba(8, 15, 31, .84), rgba(2, 6, 23, .68));
    padding: 16px;
  }
  .quiz-question h3 {
    margin: 0;
    color: #f8fafc;
    font-size: 17px;
    line-height: 1.35;
  }
  .quiz-options {
    display: grid;
    gap: 8px;
  }
  .quiz-feedback {
    display: none;
    border: 1px solid rgba(103, 232, 249, .18);
    border-radius: 8px;
    background: rgba(103, 232, 249, .08);
    color: #dbeafe;
    padding: 12px;
    font-size: 13px;
    line-height: 1.55;
  }
  .quiz-feedback strong {
    color: #f8fafc;
  }
  .quiz-question[data-answered="true"] .quiz-feedback {
    display: grid;
    gap: 6px;
  }
  .quiz-question[data-result="correct"] .quiz-feedback {
    border-color: rgba(34, 197, 94, .32);
    background: rgba(34, 197, 94, .1);
  }
  .quiz-question[data-result="wrong"] .quiz-feedback {
    border-color: rgba(251, 113, 133, .36);
    background: rgba(251, 113, 133, .1);
  }
  .quiz-option.is-correct {
    border-color: rgba(34, 197, 94, .86);
    color: #dcfce7;
    background: linear-gradient(180deg, rgba(34, 197, 94, .24), rgba(34, 197, 94, .09));
  }
  .quiz-option.is-wrong {
    border-color: rgba(251, 113, 133, .86);
    color: #ffe4e6;
    background: linear-gradient(180deg, rgba(251, 113, 133, .22), rgba(251, 113, 133, .08));
  }
  @media (max-width: 860px) {
    .planet-list {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }
    .quiz-grid {
      grid-template-columns: 1fr;
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
    [data-runtime="solar-system"] .planet-popover {
      width: min(286px, calc(100% - 22px));
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

function createSunSurfaceTexture() {
  const canvasEl = document.createElement("canvas");
  canvasEl.width = 768;
  canvasEl.height = 384;
  const context = canvasEl.getContext("2d");
  const gradient = context.createLinearGradient(0, 0, 768, 384);
  gradient.addColorStop(0, "#fff3a3");
  gradient.addColorStop(0.28, "#ffd166");
  gradient.addColorStop(0.62, "#ff8f1f");
  gradient.addColorStop(1, "#f4511e");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 768, 384);

  for (let y = -28; y < 420; y += 18) {
    context.globalAlpha = 0.18;
    context.fillStyle = y % 54 === 0 ? "#fff7b8" : "#e85d04";
    context.beginPath();
    context.moveTo(0, y);
    for (let x = 0; x <= 768; x += 24) {
      context.lineTo(
        x,
        y +
          Math.sin(x * 0.022 + y * 0.035) * 9 +
          Math.cos(x * 0.043 + y * 0.017) * 5
      );
    }
    for (let x = 768; x >= 0; x -= 24) {
      context.lineTo(
        x,
        y +
          19 +
          Math.cos(x * 0.018 + y * 0.04) * 8 +
          Math.sin(x * 0.037) * 4
      );
    }
    context.closePath();
    context.fill();
  }

  for (let i = 0; i < 180; i += 1) {
    const x = (Math.sin(i * 93.13) * 0.5 + 0.5) * 768;
    const y = (Math.cos(i * 51.71) * 0.5 + 0.5) * 384;
    const radius = 4 + (Math.sin(i * 19.19) * 0.5 + 0.5) * 18;
    const spot = context.createRadialGradient(x, y, 0, x, y, radius);
    spot.addColorStop(0, "rgba(255, 247, 168, .5)");
    spot.addColorStop(0.42, "rgba(255, 180, 64, .24)");
    spot.addColorStop(1, "rgba(164, 42, 12, 0)");
    context.fillStyle = spot;
    context.globalAlpha = 0.45;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  }

  context.globalAlpha = 1;
  const texture = new THREE.CanvasTexture(canvasEl);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

function createRadialFlareTexture(innerColor, outerColor) {
  const canvasEl = document.createElement("canvas");
  canvasEl.width = 512;
  canvasEl.height = 512;
  const context = canvasEl.getContext("2d");
  const gradient = context.createRadialGradient(256, 256, 22, 256, 256, 256);
  gradient.addColorStop(0, innerColor);
  gradient.addColorStop(0.36, outerColor);
  gradient.addColorStop(1, "rgba(255, 106, 0, 0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 512, 512);
  return new THREE.CanvasTexture(canvasEl);
}

const ambient = new THREE.AmbientLight(0x8a_a4_d6, 0.82);
scene.add(ambient);

const rimLight = new THREE.DirectionalLight(0x67_e8_f9, 1.2);
rimLight.position.set(-14, 18, -10);
scene.add(rimLight);

const sunLight = new THREE.PointLight(0xff_d1_66, 12, 140);
scene.add(sunLight);

const sunSurfaceTexture = createSunSurfaceTexture();
const sun = new THREE.Mesh(
  new THREE.SphereGeometry(1.8, 72, 72),
  new THREE.MeshBasicMaterial({
    color: 0xff_d1_66,
    map: sunSurfaceTexture,
    toneMapped: false,
  })
);
sun.userData.bodyId = sunInfo.id;
sun.userData.body = sunInfo;
sun.userData.surfaceTexture = sunSurfaceTexture;
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

const sunCorona = new THREE.Sprite(
  new THREE.SpriteMaterial({
    map: createRadialFlareTexture(
      "rgba(255, 248, 184, .72)",
      "rgba(255, 132, 24, .26)"
    ),
    transparent: true,
    opacity: 0.78,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  })
);
sunCorona.scale.set(7.4, 7.4, 1);
scene.add(sunCorona);

const sunAura = new THREE.Sprite(
  new THREE.SpriteMaterial({
    map: createRadialFlareTexture(
      "rgba(255, 214, 102, .22)",
      "rgba(251, 113, 33, .11)"
    ),
    transparent: true,
    opacity: 0.54,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  })
);
sunAura.scale.set(12.5, 12.5, 1);
scene.add(sunAura);

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
const orbitingPlanetMeshes = [];
const orbitLines = [];
clickable.push(sun);

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
  orbitingPlanetMeshes.push(mesh);

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
let selectedType = null;
let distance = 34;
let theta = -0.85;
let phi = 1.04;
const selectedPlanetDistanceMultiplier = 10;
const selectedPlanetMinDistance = 10;
const target = new THREE.Vector3(0, 0, 0);
const desiredTarget = new THREE.Vector3(0, 0, 0);

const nameEl = document.getElementById("planet-name");
const descriptionEl = document.getElementById("planet-description");
const diameterEl = document.getElementById("planet-diameter");
const distanceEl = document.getElementById("planet-distance");
const periodEl = document.getElementById("planet-period");
const gravityEl = document.getElementById("planet-gravity");
const gravityNoteEl = document.getElementById("gravity-note");
const factsEl = document.getElementById("planet-facts");
const listEl = document.getElementById("planet-list");
const resetBtn = document.getElementById("reset-view");
const popupPosition = new THREE.Vector3();
const popupScreenPosition = new THREE.Vector3();
const planetPopup = document.createElement("div");
planetPopup.className = "planet-popover";
planetPopup.setAttribute("role", "status");
planetPopup.setAttribute("aria-live", "polite");
planetPopup.dataset.open = "false";
planetPopup.innerHTML = `
  <div class="planet-popover-arrow" aria-hidden="true"></div>
  <div class="planet-popover-body">
    <button class="planet-popover-close" type="button" aria-label="Close popup">x</button>
    <span class="planet-popover-kicker">Selected body</span>
    <h3 class="planet-popover-title"></h3>
    <p class="planet-popover-description"></p>
    <div class="planet-popover-meta">
      <span>Diameter</span><span data-popup-diameter></span>
      <span>Distance</span><span data-popup-distance></span>
      <span>Orbit</span><span data-popup-period></span>
      <span>Gravity</span><span data-popup-gravity></span>
    </div>
    <p class="planet-popover-gravity"></p>
  </div>
`;
root.appendChild(planetPopup);

const popupTitleEl = planetPopup.querySelector(".planet-popover-title");
const popupDescriptionEl = planetPopup.querySelector(".planet-popover-description");
const popupDiameterEl = planetPopup.querySelector("[data-popup-diameter]");
const popupDistanceEl = planetPopup.querySelector("[data-popup-distance]");
const popupPeriodEl = planetPopup.querySelector("[data-popup-period]");
const popupGravityEl = planetPopup.querySelector("[data-popup-gravity]");
const popupGravityNoteEl = planetPopup.querySelector(".planet-popover-gravity");
const popupCloseBtn = planetPopup.querySelector(".planet-popover-close");

function getGravitySummary(body) {
  if (!(body.surfaceGravity || body.gravityComparedToEarth)) {
    return "—";
  }
  return [body.surfaceGravity, body.gravityComparedToEarth].filter(Boolean).join(" · ");
}

function setActiveButton() {
  for (const button of listEl?.querySelectorAll("button") || []) {
    button.classList.toggle("active", button.dataset.bodyId === selectedId);
  }
}

function updateDetails(body) {
  if (nameEl) {
    nameEl.textContent = body.name;
  }
  if (descriptionEl) {
    descriptionEl.textContent = body.description;
  }
  if (diameterEl) {
    diameterEl.textContent = body.diameter;
  }
  if (distanceEl) {
    distanceEl.textContent = body.distanceFromSun;
  }
  if (periodEl) {
    periodEl.textContent = body.orbitalPeriod;
  }
  if (gravityEl) {
    gravityEl.textContent = getGravitySummary(body);
  }
  if (gravityNoteEl) {
    gravityNoteEl.textContent =
      body.gravityNote ||
      "Gravity is the attractive force between objects with mass. Bigger and denser worlds usually pull more strongly.";
  }
  if (factsEl) {
    factsEl.innerHTML = "";
    for (const fact of body.facts || []) {
      const li = document.createElement("li");
      li.textContent = fact;
      factsEl.appendChild(li);
    }
  }
}

function updatePopupDetails(body) {
  if (popupTitleEl) {
    popupTitleEl.textContent = body.name;
  }
  if (popupDescriptionEl) {
    popupDescriptionEl.textContent = body.description;
  }
  if (popupDiameterEl) {
    popupDiameterEl.textContent = body.diameter;
  }
  if (popupDistanceEl) {
    popupDistanceEl.textContent = body.distanceFromSun;
  }
  if (popupPeriodEl) {
    popupPeriodEl.textContent = body.orbitalPeriod;
  }
  if (popupGravityEl) {
    popupGravityEl.textContent = getGravitySummary(body);
  }
  if (popupGravityNoteEl) {
    popupGravityNoteEl.textContent = body.gravityNote || "";
  }
}

function showPlanetPopup(body) {
  updatePopupDetails(body);
  planetPopup.dataset.open = "true";
}

function hidePlanetPopup() {
  planetPopup.dataset.open = "false";
}

function getSelectedObject() {
  if (selectedType === "sun") {
    return sun;
  }
  if (selectedType === "planet" && selectedId) {
    return planetMeshes.get(selectedId) || null;
  }
  return null;
}

function updatePopupPosition() {
  if (planetPopup.dataset.open !== "true") {
    return;
  }

  const selectedObject = getSelectedObject();
  if (!selectedObject) {
    hidePlanetPopup();
    return;
  }

  const rect = root.getBoundingClientRect();
  selectedObject.getWorldPosition(popupPosition);
  popupScreenPosition.copy(popupPosition).project(camera);

  if (popupScreenPosition.z < -1 || popupScreenPosition.z > 1) {
    planetPopup.dataset.open = "false";
    return;
  }

  const anchorX = ((popupScreenPosition.x + 1) / 2) * rect.width;
  const anchorY = ((-popupScreenPosition.y + 1) / 2) * rect.height;
  const popupWidth = planetPopup.offsetWidth || 310;
  const popupHeight = planetPopup.offsetHeight || 170;
  const margin = 12;
  const gap = 42;
  const placeBelow = anchorY - popupHeight - gap < margin;
  const minX = margin;
  const maxX = Math.max(minX, rect.width - popupWidth - margin);
  const left = Math.min(Math.max(anchorX - popupWidth / 2, minX), maxX);
  const top = placeBelow
    ? Math.min(anchorY + gap, Math.max(margin, rect.height - popupHeight - margin))
    : Math.max(margin, anchorY - popupHeight - gap);
  const arrowX = Math.min(Math.max(anchorX - left, 18), popupWidth - 18);

  planetPopup.dataset.side = placeBelow ? "below" : "above";
  planetPopup.style.setProperty("--popup-x", `${left}px`);
  planetPopup.style.setProperty("--popup-y", `${top}px`);
  planetPopup.style.setProperty("--arrow-x", `${arrowX}px`);
  planetPopup.style.setProperty("--origin-x", `${arrowX}px`);
}

function selectSun() {
  selectedId = sunInfo.id;
  selectedType = "sun";
  distance = 9;
  desiredTarget.set(0, 0, 0);
  selectedRing.material.opacity = 0.72;
  selectedRing.scale.setScalar(sunInfo.radius * 1.85);
  selectedRing.position.set(0, 0, 0);
  updateDetails(sunInfo);
  showPlanetPopup(sunInfo);
  setActiveButton();
}

function selectPlanet(id) {
  selectedId = id;
  selectedType = "planet";
  const planet = planets.find((item) => item.id === id);
  const mesh = planetMeshes.get(id);
  if (!(planet && mesh)) {
    return;
  }
  distance = Math.max(
    planet.radius * selectedPlanetDistanceMultiplier,
    selectedPlanetMinDistance
  );
  selectedRing.material.opacity = 0.78;
  selectedRing.scale.setScalar(planet.radius * 1.75);
  updateDetails(planet);
  showPlanetPopup(planet);
  desiredTarget.copy(mesh.position);
  setActiveButton();
}

function resetView() {
  selectedId = null;
  selectedType = null;
  distance = 34;
  desiredTarget.set(0, 0, 0);
  selectedRing.material.opacity = 0;
  if (nameEl) {
    nameEl.textContent = "Overview";
  }
  if (descriptionEl) {
    descriptionEl.textContent =
      "Click the Sun or a planet to zoom in and read detailed information.";
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
  if (gravityEl) {
    gravityEl.textContent = "—";
  }
  if (gravityNoteEl) {
    gravityNoteEl.textContent =
      "Gravity is the attractive force between objects with mass. Bigger and denser worlds usually pull more strongly, so the same student would weigh different amounts on different planets.";
  }
  if (factsEl) {
    factsEl.innerHTML =
      "<li>The solar system includes the Sun, eight planets, and many smaller bodies.</li><li>Compare gravity values to predict where jumping, walking, or launching a rocket would be easiest.</li>";
  }
  hidePlanetPopup();
  setActiveButton();
}

if (listEl) {
  const sunButton = document.createElement("button");
  sunButton.type = "button";
  sunButton.dataset.bodyId = sunInfo.id;
  sunButton.textContent = sunInfo.name;
  sunButton.addEventListener("click", selectSun);
  listEl.appendChild(sunButton);

  for (const planet of planets) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.bodyId = planet.id;
    button.textContent = planet.name;
    button.addEventListener("click", () => selectPlanet(planet.id));
    listEl.appendChild(button);
  }
}

function getSolarQuizItems() {
  const customItems = Array.isArray(lesson.quizItems) ? lesson.quizItems : [];
  const validItems = customItems.filter(
    (item) =>
      item &&
      typeof item.question === "string" &&
      Array.isArray(item.choices) &&
      typeof item.answer === "string"
  );
  const items = [];
  for (const item of [...validItems, ...defaultSolarQuizItems]) {
    if (items.some((existing) => existing.question === item.question)) {
      continue;
    }
    items.push({
      question: item.question,
      choices: item.choices,
      answer: item.answer,
      explanation:
        item.explanation ||
        "This answer matches the model and the lesson details above.",
      funFact:
        item.funFact ||
        "A good astronomer checks the evidence, then looks for one more surprising detail.",
    });
    if (items.length === 3) {
      break;
    }
  }
  return items;
}

function renderSolarQuiz() {
  const quizRoot =
    document.querySelector("[data-solar-quiz]") ||
    document.querySelector(".quiz-card");
  if (!quizRoot) {
    return;
  }

  quizRoot.dataset.solarQuiz = "true";
  quizRoot.innerHTML = "";

  const kicker = document.createElement("p");
  kicker.className = "kicker";
  kicker.textContent = "Quick check";
  quizRoot.appendChild(kicker);

  const heading = document.createElement("h2");
  heading.textContent = "Test your orbit instincts";
  quizRoot.appendChild(heading);

  const intro = document.createElement("p");
  intro.className = "summary";
  intro.textContent =
    "Choose an answer to reveal the result, the reason, and a curious detail.";
  quizRoot.appendChild(intro);

  const grid = document.createElement("div");
  grid.className = "quiz-grid";
  quizRoot.appendChild(grid);

  getSolarQuizItems().forEach((item, index) => {
    const article = document.createElement("article");
    article.className = "quiz-question";
    article.dataset.answered = "false";

    const title = document.createElement("h3");
    title.textContent = `${index + 1}. ${item.question}`;
    article.appendChild(title);

    const options = document.createElement("div");
    options.className = "quiz-options";
    article.appendChild(options);

    const feedback = document.createElement("div");
    feedback.className = "quiz-feedback";
    feedback.setAttribute("aria-live", "polite");
    article.appendChild(feedback);

    for (const choice of item.choices) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "quiz-option";
      button.textContent = choice;
      button.addEventListener("click", () => {
        const isCorrect = choice === item.answer;
        article.dataset.answered = "true";
        article.dataset.result = isCorrect ? "correct" : "wrong";

        for (const option of options.querySelectorAll("button")) {
          option.disabled = true;
          option.classList.toggle("is-correct", option.textContent === item.answer);
          option.classList.toggle(
            "is-wrong",
            option === button && !isCorrect
          );
        }

        feedback.innerHTML = "";
        const result = document.createElement("strong");
        result.textContent = isCorrect
          ? "Correct."
          : `Not quite. The answer is ${item.answer}.`;
        feedback.appendChild(result);

        const explanation = document.createElement("span");
        explanation.textContent = item.explanation;
        feedback.appendChild(explanation);

        const funFact = document.createElement("span");
        funFact.textContent = `Interesting fact: ${item.funFact}`;
        feedback.appendChild(funFact);
      });
      options.appendChild(button);
    }

    grid.appendChild(article);
  });
}

renderSolarQuiz();
resetBtn?.addEventListener("click", resetView);
popupCloseBtn?.addEventListener("click", hidePlanetPopup);

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
  if (hit?.object?.userData?.bodyId === sunInfo.id) {
    selectSun();
  } else if (hit?.object?.userData?.planetId) {
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
  sun.userData.surfaceTexture.offset.x = (sun.userData.surfaceTexture.offset.x + 0.00008 * dt) % 1;
  sunGlow.scale.setScalar(1 + Math.sin(time * 0.0018) * 0.018);
  outerSunGlow.scale.setScalar(1 + Math.cos(time * 0.0012) * 0.028);
  sunCorona.material.opacity = 0.68 + Math.sin(time * 0.0014) * 0.08;
  sunCorona.scale.setScalar(7.1 + Math.sin(time * 0.001) * 0.28);
  sunAura.material.opacity = 0.42 + Math.cos(time * 0.0009) * 0.08;
  sunAura.scale.setScalar(12.2 + Math.cos(time * 0.0007) * 0.45);

  for (const [index, orbit] of orbitLines.entries()) {
    orbit.material.opacity = 0.13 + Math.sin(time * 0.0007 + index) * 0.035;
  }

  for (const mesh of orbitingPlanetMeshes) {
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

  if (selectedType === "sun") {
    selectedRing.position.set(0, 0, 0);
    selectedRing.lookAt(camera.position);
    selectedRing.rotation.z += 0.007 * (dt / 16);
  } else if (selectedType === "planet" && selectedId) {
    const selected = planetMeshes.get(selectedId);
    if (selected) {
      desiredTarget.copy(selected.position);
      selectedRing.position.copy(selected.position);
      selectedRing.lookAt(camera.position);
      selectedRing.rotation.z += 0.01 * (dt / 16);
    }
  }

  updateCamera();
  updatePopupPosition();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

resize();
resetView();
window.addEventListener("resize", resize);
requestAnimationFrame(animate);
