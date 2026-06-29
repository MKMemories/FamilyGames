import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

/* ════════════════════════════════════════════════════════════════════════
   LE CHRONOVORE — Le Mangeur de Temps
   Une escape room 3D narrative. Vous êtes enfermé dans un instant figé du
   temps : l'écho quantique de la bibliothèque d'un alchimiste vénitien du
   XVIIᵉ siècle. Pour vous échapper, comprenez la logique de l'écho, activez
   le globe céleste, traquez les Anomalies Chronologiques, puis sacrifiez le
   journal dans le Puits de Temps pour ré-ancrer le moment dans la réalité.

   Tout est procédural : géométrie, shaders verre-fragmenté, audio WebAudio,
   et voix off (SpeechSynthesis). Aucun asset externe.
   ════════════════════════════════════════════════════════════════════════ */

const JOURNAL_FINAL = [
  "« J'ai vu trop loin. La lentille que j'ai taillée ne montrait pas l'avenir —",
  "elle le dévorait. Chaque heure que je volais au temps, le Chronovore la",
  "réclamait. Quand Lucrezia a compris, elle a voulu briser la carte des heures.",
  "Nous nous sommes battus pour une chose qui n'aurait jamais dû exister.",
  "Si tu lis ceci, c'est que l'écho t'a choisi. Rends-lui ce moment, étranger.",
  "Laisse la lumière revenir. Et laisse-moi, enfin, être oublié. »",
  "— Maître Aurelio Vendramin, l'an de grâce 1631",
].join(" ");

type Phase = "intro" | "stasis" | "ending" | "epilogue";

interface ChronovoreProps {
  onLeave: () => void;
}

export function Chronovore({ onLeave }: ChronovoreProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const apiRef = useRef<{ start: () => void; replay: () => void; dispose: () => void } | null>(null);

  const [phase, setPhase] = useState<Phase>("intro");
  const [objective, setObjective] = useState("Observe l'écho. Quelque chose attend d'être réveillé.");
  const [caption, setCaption] = useState("");
  const [anomalies, setAnomalies] = useState(0);
  const [globeOn, setGlobeOn] = useState(false);
  const [vortexReady, setVortexReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Stable HUD bridge the engine writes to.
  const hud = useRef({
    setPhase, setObjective, setCaption, setAnomalies, setGlobeOn, setVortexReady,
  });
  hud.current = { setPhase, setObjective, setCaption, setAnomalies, setGlobeOn, setVortexReady };

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let engine: ReturnType<typeof createEngine> | null = null;
    try {
      engine = createEngine(mount, hud);
      apiRef.current = engine;
    } catch (e) {
      console.error("Chronovore engine failed:", e);
      setLoadError("Cet écho exige un navigateur compatible WebGL.");
    }
    return () => { engine?.dispose(); };
  }, []);

  const handleStart = useCallback(() => {
    apiRef.current?.start();
    setPhase("stasis");
  }, []);

  const handleReplay = useCallback(() => {
    setAnomalies(0); setGlobeOn(false); setVortexReady(false);
    setObjective("Observe l'écho. Quelque chose attend d'être réveillé.");
    setCaption("");
    apiRef.current?.replay();
    setPhase("stasis");
  }, []);

  return (
    <div className="chrono-root">
      <div ref={mountRef} className="chrono-canvas" />

      {/* ── In-world HUD ─────────────────────────────── */}
      {(phase === "stasis" || phase === "ending") && (
        <div className="chrono-hud">
          <button className="chrono-exit" onClick={onLeave} title="Quitter l'écho">✕</button>
          <div className="chrono-objective">
            <span className="chrono-obj-label">◈ Écho temporel</span>
            <span className="chrono-obj-text">{objective}</span>
          </div>
          <div className="chrono-status">
            <div className={`chrono-pill ${globeOn ? "done" : ""}`}>🜨 Globe {globeOn ? "✓" : "—"}</div>
            <div className="chrono-pill">⌛ Anomalies {anomalies}/3</div>
            {vortexReady && <div className="chrono-pill vortex">🌀 Puits ouvert</div>}
          </div>
          {caption && <div key={caption} className="chrono-caption">{caption}</div>}
        </div>
      )}

      {/* ── Intro overlay ────────────────────────────── */}
      {phase === "intro" && (
        <div className="chrono-overlay">
          <div className="chrono-modal">
            <div className="chrono-glyph">🔮</div>
            <h1 className="chrono-title">Le Chronovore</h1>
            <p className="chrono-sub">Le Mangeur de Temps</p>
            <p className="chrono-lore">
              Tu n'es pas enfermé dans une pièce. Tu es enfermé dans un <em>instant figé du temps</em> —
              l'écho quantique de la bibliothèque d'un alchimiste vénitien, effacée de la réalité.
              Comprends la logique de l'écho, réveille ses artefacts, traque les anomalies, et
              ré-ancre ce moment… avant qu'il ne s'effondre en t'emportant.
            </p>
            <ul className="chrono-hints">
              <li>🖱️ <b>Glisse</b> pour pivoter autour de l'écho · molette pour zoomer</li>
              <li>👆 <b>Clique</b> les objets fracturés pour interagir</li>
              <li>🔊 Active le son pour l'expérience complète</li>
            </ul>
            {loadError
              ? <p className="chrono-err">{loadError}</p>
              : <button className="chrono-enter" onClick={handleStart}>Entrer dans l'écho →</button>}
            <button className="chrono-skip" onClick={onLeave}>Revenir</button>
          </div>
        </div>
      )}

      {/* ── Epilogue overlay ─────────────────────────── */}
      {phase === "epilogue" && (
        <div className="chrono-overlay epilogue">
          <div className="chrono-modal warm">
            <div className="chrono-glyph">📖</div>
            <h1 className="chrono-title warm">Le moment, ré-ancré</h1>
            <p className="chrono-journal">{JOURNAL_FINAL}</p>
            <p className="chrono-sub warm">La lumière est revenue. L'écho repose, enfin réel.</p>
            <div className="chrono-end-btns">
              <button className="chrono-enter" onClick={onLeave}>Quitter l'écho</button>
              <button className="chrono-skip" onClick={handleReplay}>Revivre l'instant</button>
            </div>
          </div>
        </div>
      )}

      <style>{CHRONO_CSS}</style>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   ENGINE
   ════════════════════════════════════════════════════════════════════════ */

type Hud = React.MutableRefObject<{
  setPhase: (p: Phase) => void;
  setObjective: (s: string) => void;
  setCaption: (s: string) => void;
  setAnomalies: (n: number) => void;
  setGlobeOn: (b: boolean) => void;
  setVortexReady: (b: boolean) => void;
}>;

const COL_BLUE = new THREE.Color("#3aa0ff");
const COL_GOLD = new THREE.Color("#ffc24a");
const COL_WOOD = new THREE.Color("#5a3a22");

/* ── Quantum glass shader ───────────────────────────
   uReal: 0 = écho fragmenté translucide / 1 = bois solide et réel.       */
const QUANTUM_VERT = /* glsl */`
  uniform float uTime;
  uniform float uReal;
  uniform float uShatter;     // 0..1 extra explosion (globe shards / rupture)
  varying vec3 vNormalW;
  varying vec3 vPosW;
  varying vec3 vPosL;
  varying float vSeed;

  float hash(vec3 p){ return fract(sin(dot(p, vec3(17.1, 113.5, 53.7))) * 43758.5453); }

  void main(){
    vPosL = position;
    vSeed = hash(floor(position * 3.0));
    // Floating-fragment drift, vanishing as the world becomes real.
    float drift = (1.0 - uReal);
    vec3 dir = normalize(normal + 0.0001);
    float wobble = sin(uTime * 0.9 + vSeed * 28.0) * 0.018
                 + cos(uTime * 0.6 + vSeed * 51.0) * 0.012;
    vec3 displaced = position + dir * wobble * drift;
    displaced += dir * uShatter * (0.25 + vSeed * 0.6);
    vec4 wp = modelMatrix * vec4(displaced, 1.0);
    vPosW = wp.xyz;
    vNormalW = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const QUANTUM_FRAG = /* glsl */`
  precision highp float;
  uniform float uTime;
  uniform float uReal;
  uniform vec3  uBlue;
  uniform vec3  uGold;
  uniform vec3  uBase;     // real-world base colour (wood / stone)
  uniform vec3  uSunDir;
  uniform float uSun;      // warm sunlight intensity at the end
  varying vec3 vNormalW;
  varying vec3 vPosW;
  varying vec3 vPosL;
  varying float vSeed;

  void main(){
    vec3 N = normalize(vNormalW);
    vec3 V = normalize(cameraPosition - vPosW);
    float fres = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 2.4);

    // Fracture lines: thin glowing seams threading the glass.
    vec3 g = vPosL * 3.2;
    float seam = min(min(abs(fract(g.x) - 0.5), abs(fract(g.y) - 0.5)), abs(fract(g.z) - 0.5));
    float cracks = smoothstep(0.035, 0.0, seam);

    // Quantum energy weave — slow pulse travelling through the seams.
    float pulse = 0.5 + 0.5 * sin(uTime * 1.4 + vSeed * 20.0 + vPosW.y * 1.5);
    float vein  = smoothstep(0.78, 1.0, sin(vPosL.x * 9.0 + uTime) * sin(vPosL.z * 9.0 - uTime * 0.7));

    // Stasis appearance: a DIM translucent body with BRIGHT glowing accents,
    // so the frame keeps deep darks and only the seams/rims bloom.
    vec3 body    = uBlue * 0.12;
    vec3 accents = uGold * (cracks * (1.2 + 0.5 * pulse) + vein * 0.7)
                 + uBlue * fres * 0.55;
    vec3 glassCol = body + accents;
    float glassA  = clamp(0.14 + fres * 0.5 + cracks * 0.6 + vein * 0.35, 0.05, 0.92);

    // Real appearance — lit wood with warm sun.
    float ndl = max(dot(N, normalize(uSunDir)), 0.0);
    float grain = 0.85 + 0.15 * sin(vPosL.y * 40.0 + vPosL.x * 8.0);
    vec3 realCol = uBase * grain * (0.25 + 0.9 * ndl * uSun) + uGold * 0.04 * uSun;

    vec3 col = mix(glassCol, realCol, uReal);
    float a  = mix(glassA, 1.0, uReal);
    gl_FragColor = vec4(col, a);
  }
`;

function makeQuantumMaterial(base: THREE.Color, opts: Partial<{ shatter: number; depthWrite: boolean }> = {}) {
  return new THREE.ShaderMaterial({
    vertexShader: QUANTUM_VERT,
    fragmentShader: QUANTUM_FRAG,
    transparent: true,
    depthWrite: opts.depthWrite ?? false,
    side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: 0 },
      uReal: { value: 0 },
      uShatter: { value: opts.shatter ?? 0 },
      uBlue: { value: COL_BLUE.clone() },
      uGold: { value: COL_GOLD.clone() },
      uBase: { value: base.clone() },
      uSunDir: { value: new THREE.Vector3(0.4, 0.9, 0.3) },
      uSun: { value: 0 },
    },
  });
}

function createEngine(mount: HTMLDivElement, hud: Hud) {
  const W = () => mount.clientWidth || window.innerWidth;
  const H = () => mount.clientHeight || window.innerHeight;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(W(), H());
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  mount.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#040a1c");
  scene.fog = new THREE.FogExp2(new THREE.Color("#04122e"), 0.045);

  const camera = new THREE.PerspectiveCamera(55, W() / H(), 0.1, 200);
  camera.position.set(0, 1.4, 8.5);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.target.set(0, 1.2, 0);
  controls.minDistance = 3.5;
  controls.maxDistance = 12;
  controls.maxPolarAngle = Math.PI * 0.86;
  controls.minPolarAngle = Math.PI * 0.12;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.35;

  // ── Lighting ──────────────────────────────────────
  const ambient = new THREE.AmbientLight(0x3a5a9a, 0.6);
  scene.add(ambient);
  const keyBlue = new THREE.PointLight(0x4aa6ff, 26, 40, 2);
  keyBlue.position.set(-3, 5, 3);
  scene.add(keyBlue);
  const rimGold = new THREE.PointLight(0xffb84a, 18, 40, 2);
  rimGold.position.set(4, 2, -2);
  scene.add(rimGold);
  const sun = new THREE.DirectionalLight(0xffe6b0, 0); // warm sun, off until ending
  sun.position.set(6, 7, 4);
  scene.add(sun);
  const sunGlow = new THREE.PointLight(0xfff0c0, 0, 60, 2);
  sunGlow.position.set(7, 4, 3);
  scene.add(sunGlow);

  // ── Materials registry (so we can lerp uReal/uSun globally) ──
  const quantumMats: THREE.ShaderMaterial[] = [];
  const reg = (m: THREE.ShaderMaterial) => { quantumMats.push(m); return m; };

  const root = new THREE.Group();
  scene.add(root);

  /* ── The baroque library shell ─────────────────── */
  const SIZE = 9;
  const shellMat = reg(makeQuantumMaterial(COL_WOOD, { depthWrite: true }));
  const shell = new THREE.Mesh(new THREE.BoxGeometry(SIZE, SIZE, SIZE), shellMat);
  shell.material.side = THREE.BackSide;
  shell.position.y = SIZE / 2 - 1.5;
  root.add(shell);

  // Coffered floor
  const floorMat = reg(makeQuantumMaterial(new THREE.Color("#3a2415"), { depthWrite: true }));
  const floor = new THREE.Mesh(new THREE.BoxGeometry(SIZE, 0.2, SIZE), floorMat);
  floor.position.y = -1.5;
  root.add(floor);

  // Bookshelves lining the walls
  const shelfMat = reg(makeQuantumMaterial(new THREE.Color("#4a2e1a"), { depthWrite: true }));
  const bookMat = reg(makeQuantumMaterial(new THREE.Color("#6a3326"), { depthWrite: true }));
  function buildShelfWall(x: number, z: number, rotY: number) {
    const g = new THREE.Group();
    g.position.set(x, 1.4, z);
    g.rotation.y = rotY;
    for (let row = 0; row < 4; row++) {
      const plank = new THREE.Mesh(new THREE.BoxGeometry(6, 0.12, 0.5), shelfMat);
      plank.position.set(0, row * 1.1 - 1.2, 0);
      g.add(plank);
      // books
      let bx = -2.7;
      while (bx < 2.7) {
        const bw = 0.12 + Math.random() * 0.12;
        const bh = 0.5 + Math.random() * 0.45;
        const book = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, 0.34), bookMat);
        book.position.set(bx + bw / 2, row * 1.1 - 1.2 + bh / 2 + 0.06, 0);
        book.rotation.z = Math.random() < 0.12 ? (Math.random() - 0.5) * 0.5 : 0;
        g.add(book);
        bx += bw + 0.015;
      }
    }
    // side columns
    for (const sx of [-3, 3]) {
      const col = new THREE.Mesh(new THREE.BoxGeometry(0.3, 4.6, 0.6), shelfMat);
      col.position.set(sx, 0.1, 0);
      g.add(col);
    }
    root.add(g);
  }
  buildShelfWall(0, -4.2, 0);
  buildShelfWall(-4.2, 0, Math.PI / 2);
  buildShelfWall(4.2, 0, -Math.PI / 2);

  // Alchemist's desk
  const deskMat = reg(makeQuantumMaterial(new THREE.Color("#4f3320"), { depthWrite: true }));
  const desk = new THREE.Group();
  desk.position.set(0, -1.5, 2.2);
  const top = new THREE.Mesh(new THREE.BoxGeometry(3, 0.16, 1.4), deskMat);
  top.position.y = 1.0;
  desk.add(top);
  for (const [lx, lz] of [[-1.3, -0.55], [1.3, -0.55], [-1.3, 0.55], [1.3, 0.55]] as const) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1, 0.16), deskMat);
    leg.position.set(lx, 0.5, lz);
    desk.add(leg);
  }
  root.add(desk);

  /* ── The celestial globe (interactive) ───────────── */
  const globePivot = new THREE.Group();
  globePivot.position.set(0, 0.0, 2.2);
  root.add(globePivot);

  const globeMat = reg(makeQuantumMaterial(new THREE.Color("#2e6fb0")));
  const globeSolid = new THREE.Mesh(new THREE.IcosahedronGeometry(0.62, 2), globeMat);
  globePivot.add(globeSolid);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.78, 0.035, 12, 60), reg(makeQuantumMaterial(COL_GOLD)));
  ring.rotation.x = Math.PI / 2.3;
  globePivot.add(ring);
  const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.18, 0.5, 12), deskMat);
  stand.position.y = -0.9;
  globePivot.add(stand);
  // Visible additive flash for the violent reassembly (lights don't affect
  // the custom shader, so the "gold flash" must be its own glowing mesh).
  const flashMat = new THREE.MeshBasicMaterial({ color: 0xffd870, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  const globeFlash = new THREE.Mesh(new THREE.SphereGeometry(0.7, 24, 24), flashMat);
  globePivot.add(globeFlash);

  // Globe shards (hidden until activation)
  const shardMat = reg(makeQuantumMaterial(new THREE.Color("#2e6fb0"), { shatter: 0 }));
  const shards = new THREE.Group();
  shards.visible = false;
  globePivot.add(shards);
  const shardDirs: THREE.Vector3[] = [];
  for (let i = 0; i < 26; i++) {
    const s = new THREE.Mesh(new THREE.TetrahedronGeometry(0.16 + Math.random() * 0.1), shardMat);
    const dir = new THREE.Vector3().setFromSphericalCoords(0.6, Math.acos(2 * Math.random() - 1), Math.random() * Math.PI * 2);
    s.position.copy(dir);
    s.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
    shardDirs.push(dir.clone().normalize());
    shards.add(s);
  }

  /* ── Floating debris of the broken library ───────── */
  const debrisMat = reg(makeQuantumMaterial(new THREE.Color("#3b5a8a")));
  const debris = new THREE.Group();
  root.add(debris);
  const debrisData: { mesh: THREE.Mesh; home: THREE.Vector3; spin: THREE.Vector3 }[] = [];
  for (let i = 0; i < 90; i++) {
    const geo = Math.random() < 0.5
      ? new THREE.TetrahedronGeometry(0.05 + Math.random() * 0.18)
      : new THREE.BoxGeometry(0.05 + Math.random() * 0.2, 0.05 + Math.random() * 0.2, 0.03 + Math.random() * 0.1);
    const m = new THREE.Mesh(geo, debrisMat);
    const home = new THREE.Vector3(
      (Math.random() - 0.5) * 7,
      Math.random() * 5 - 1,
      (Math.random() - 0.5) * 7,
    );
    m.position.copy(home);
    debris.add(m);
    debrisData.push({ mesh: m, home, spin: new THREE.Vector3(Math.random(), Math.random(), Math.random()).multiplyScalar(0.4) });
  }

  // Drifting motes (points) for the quantum ocean
  const moteGeo = new THREE.BufferGeometry();
  const MOTES = 600;
  const mp = new Float32Array(MOTES * 3);
  for (let i = 0; i < MOTES; i++) {
    mp[i * 3] = (Math.random() - 0.5) * 9;
    mp[i * 3 + 1] = Math.random() * 7 - 1.5;
    mp[i * 3 + 2] = (Math.random() - 0.5) * 9;
  }
  moteGeo.setAttribute("position", new THREE.BufferAttribute(mp, 3));
  const moteMat = new THREE.PointsMaterial({ color: 0x9fd0ff, size: 0.045, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false });
  const motes = new THREE.Points(moteGeo, moteMat);
  root.add(motes);

  /* ── The window (materializes at the ending) ─────── */
  const windowMat = new THREE.MeshBasicMaterial({ color: 0xfff2cf, transparent: true, opacity: 0 });
  const windowMesh = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 3.4), windowMat);
  windowMesh.position.set(0, 1.8, -4.45);
  root.add(windowMesh);
  const windowFrame = new THREE.Mesh(new THREE.BoxGeometry(2.9, 3.7, 0.12), reg(makeQuantumMaterial(new THREE.Color("#4a2e1a"), { depthWrite: true })));
  windowFrame.position.set(0, 1.8, -4.5);
  windowFrame.visible = false;
  root.add(windowFrame);

  /* ── The cryptic journal (the sacrifice) ─────────── */
  const journalMat = reg(makeQuantumMaterial(new THREE.Color("#7a2a2a")));
  const journal = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.66), journalMat);
  journal.position.set(-0.9, -0.4, 2.2);
  journal.rotation.y = 0.3;
  root.add(journal);
  const journalHomeY = journal.position.y;

  /* ── Anomalies (anachronistic objects) ───────────── */
  type Anomaly = { mesh: THREE.Object3D; found: boolean; hint: string };
  const anomalyGroup = new THREE.Group();
  root.add(anomalyGroup);
  const anomalyMat = reg(makeQuantumMaterial(new THREE.Color("#d0d8e0")));

  function smartwatch() {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.06, 0.26), anomalyMat);
    g.add(body);
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.03, 8, 24), anomalyMat);
    band.rotation.x = Math.PI / 2;
    g.add(band);
    return g;
  }
  function bottle() {
    const g = new THREE.Group();
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.4, 14), anomalyMat);
    g.add(b);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.1, 0.12, 12), anomalyMat);
    neck.position.y = 0.26; g.add(neck);
    return g;
  }
  function drone() {
    const g = new THREE.Group();
    const core = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.06, 0.18), anomalyMat);
    g.add(core);
    for (const [ax, az] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]] as const) {
      const rotor = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.015, 6, 18), anomalyMat);
      rotor.rotation.x = Math.PI / 2; rotor.position.set(ax, 0.02, az); g.add(rotor);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(Math.abs(ax) * 2, 0.02, 0.03), anomalyMat);
      arm.position.set(0, 0, az); g.add(arm);
    }
    return g;
  }
  const anomalyDefs: { make: () => THREE.Object3D; pos: [number, number, number]; hint: string }[] = [
    { make: smartwatch, pos: [3.2, 0.4, -3.0], hint: "Une lueur métallique pulse là où le bois devrait régner… vers l'est." },
    { make: bottle, pos: [-3.3, -0.2, -2.6], hint: "Quelque chose de trop lisse, de trop parfait, repose près de l'étagère ouest." },
    { make: drone, pos: [-2.6, 2.6, 1.5], hint: "Lève les yeux. Un objet qui n'a pas d'âge flotte au-dessus de toi." },
  ];
  const anomalies: Anomaly[] = anomalyDefs.map(d => {
    const m = d.make();
    m.position.set(...d.pos);
    m.scale.setScalar(0.001);
    m.visible = true;
    anomalyGroup.add(m);
    return { mesh: m, found: false, hint: d.hint };
  });

  /* ── The Puits de Temps (vortex) ─────────────────── */
  const vortex = new THREE.Group();
  vortex.position.set(0, 0.6, 0);
  vortex.visible = false;
  root.add(vortex);
  const vortexMat = new THREE.MeshBasicMaterial({ color: 0xbfe4ff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false });
  for (let i = 0; i < 5; i++) {
    const torus = new THREE.Mesh(new THREE.TorusGeometry(0.4 + i * 0.18, 0.03, 10, 48), vortexMat.clone());
    torus.rotation.x = Math.PI / 2;
    (torus as any)._i = i;
    vortex.add(torus);
  }
  const vortexCore = new THREE.Mesh(new THREE.SphereGeometry(0.3, 24, 24), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending }));
  vortex.add(vortexCore);
  const vortexLight = new THREE.PointLight(0x9fd0ff, 0, 30, 2);
  vortex.add(vortexLight);

  /* ── Ghost scene (revealed during a Rupture) ─────── */
  const ghosts = new THREE.Group();
  ghosts.visible = false;
  root.add(ghosts);
  const ghostMat = new THREE.MeshBasicMaterial({ color: 0x0a1428, transparent: true, opacity: 0, depthWrite: false });
  function silhouette(x: number, flip: number) {
    const g = new THREE.Group();
    g.position.set(x, -1.5, 1.0);
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.9, 4, 12), ghostMat);
    torso.position.y = 1.25; g.add(torso);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 16), ghostMat);
    head.position.y = 1.95; g.add(head);
    const cloak = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.3, 14), ghostMat);
    cloak.position.y = 0.65; g.add(cloak);
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.6, 4, 8), ghostMat);
    arm.position.set(flip * 0.32, 1.35, 0.15);
    arm.rotation.z = flip * 0.6;
    (g as any)._arm = arm;
    (g as any)._flip = flip;
    g.add(arm);
    return g;
  }
  const ghostA = silhouette(-0.7, 1);
  const ghostB = silhouette(0.7, -1);
  ghosts.add(ghostA, ghostB);
  const ghostTable = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.08, 0.7), ghostMat);
  ghostTable.position.set(0, 0.1, 1.0);
  ghosts.add(ghostTable);
  const ghostMap = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.55), new THREE.MeshBasicMaterial({ color: 0x6a5a2a, transparent: true, opacity: 0, depthWrite: false }));
  ghostMap.rotation.x = -Math.PI / 2;
  ghostMap.position.set(0, 0.16, 1.0);
  ghosts.add(ghostMap);

  /* ── Postprocessing (bloom) ─────────────────────── */
  let composer: EffectComposer | null = null;
  let bloom: UnrealBloomPass | null = null;
  const bloomDisabled = typeof window !== "undefined" && window.location.hash.includes("nobloom");
  try {
    if (bloomDisabled) throw new Error("bloom disabled via flag");
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    // strength, radius, threshold — gentle bloom; the scene body is dark so
    // only the bright fracture seams, the globe and the motes glow.
    bloom = new UnrealBloomPass(new THREE.Vector2(W(), H()), 0.55, 0.5, 0.6);
    composer.addPass(bloom);
  } catch (e) {
    console.warn("Bloom unavailable, falling back to direct render", e);
    composer = null;
  }

  /* ════════════════════════════════════════════════
     AUDIO ENGINE (procedural, WebAudio)
     ════════════════════════════════════════════════ */
  let actx: AudioContext | null = null;
  let masterGain: GainNode | null = null;
  let droneNodes: { osc: OscillatorNode[]; gain: GainNode } | null = null;
  function initAudio() {
    if (actx) return;
    try {
      actx = new (window.AudioContext || (window as any).webkitAudioContext)();
      masterGain = actx.createGain();
      masterGain.gain.value = 0.55;
      masterGain.connect(actx.destination);
      // ambient quantum drone
      const g = actx.createGain(); g.gain.value = 0.0; g.connect(masterGain);
      const filt = actx.createBiquadFilter(); filt.type = "lowpass"; filt.frequency.value = 420; filt.connect(g);
      const oscs = [55, 82.4, 110, 164.8].map((f, i) => {
        const o = actx!.createOscillator(); o.type = i % 2 ? "sine" : "triangle"; o.frequency.value = f;
        const detune = actx!.createGain();
        o.connect(filt); o.start(); return o;
      });
      g.gain.linearRampToValueAtTime(0.18, actx.currentTime + 4);
      droneNodes = { osc: oscs, gain: g };
    } catch (e) { console.warn("Audio unavailable", e); }
  }
  function noiseBurst(dur: number, freq: number, q: number, gain: number, type: BiquadFilterType = "bandpass") {
    if (!actx || !masterGain) return;
    const n = actx.sampleRate * dur;
    const buf = actx.createBuffer(1, n, actx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2);
    const src = actx.createBufferSource(); src.buffer = buf;
    const filt = actx.createBiquadFilter(); filt.type = type; filt.frequency.value = freq; filt.Q.value = q;
    const g = actx.createGain(); g.gain.value = gain;
    src.connect(filt); filt.connect(g); g.connect(masterGain); src.start();
  }
  function tone(freq: number, dur: number, gain: number, type: OscillatorType = "sine", glideTo?: number) {
    if (!actx || !masterGain) return;
    const o = actx.createOscillator(); o.type = type; o.frequency.value = freq;
    if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, actx.currentTime + dur);
    const g = actx.createGain(); g.gain.value = 0.0001;
    g.gain.exponentialRampToValueAtTime(gain, actx.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + dur);
    o.connect(g); g.connect(masterGain); o.start(); o.stop(actx.currentTime + dur + 0.05);
  }
  const sfx = {
    shatter() { noiseBurst(0.5, 5200, 6, 0.5, "highpass"); [1568, 2093, 2637, 3136].forEach((f, i) => setTimeout(() => tone(f, 0.5, 0.18, "triangle"), i * 35)); },
    suck() { noiseBurst(0.6, 300, 1, 0.4, "lowpass"); tone(220, 0.6, 0.25, "sawtooth", 55); },
    chime() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.9, 0.16, "sine"), i * 80)); },
    rupture() { tone(110, 2.5, 0.3, "sine", 440); noiseBurst(2.0, 800, 0.7, 0.18, "bandpass"); },
    collapse() { noiseBurst(1.4, 200, 0.6, 0.4, "lowpass"); tone(440, 1.4, 0.2, "sawtooth", 80); },
    warm() { [392, 523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 1.6, 0.14, "sine"), i * 220)); },
  };

  function speak(text: string) {
    try {
      const synth = window.speechSynthesis;
      if (!synth) return;
      synth.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "fr-FR"; u.rate = 0.86; u.pitch = 0.92; u.volume = 1;
      const fr = synth.getVoices().find(v => v.lang.startsWith("fr"));
      if (fr) u.voice = fr;
      synth.speak(u);
    } catch { /* ignore */ }
  }

  /* ════════════════════════════════════════════════
     GAME STATE MACHINE
     ════════════════════════════════════════════════ */
  type Mode = "idle" | "explore" | "globe" | "rupture" | "vortex" | "ending";
  const G = {
    mode: "idle" as Mode,
    started: false,
    realTarget: 0,         // target for uReal lerp
    real: 0,
    sunTarget: 0,
    sun: 0,
    globeOn: false,
    anomaliesFound: 0,
    // timers
    lastInteract: 0,
    hintLevel: 0,
    nextHintAt: 9999,
    // sub-sequence timers
    globeT: -1,
    ruptureT: -1,
    ruptureAnomalyIdx: -1,
    endingT: -1,
    // dragging
    dragging: false,
    captionUntil: 0,
  };

  // Single time base: `elapsed` accumulates capped frame deltas in tick().
  // Everything (captions, hints, sequences) reads it via now() so it stays
  // consistent — and we never touch clock.getElapsedTime() (see tick note).
  const clock = new THREE.Clock();
  let elapsed = 0;
  const now = () => elapsed;

  function setCaption(text: string, ms = 5200) {
    hud.current.setCaption(text);
    G.captionUntil = now() + ms / 1000;
  }
  function clearCaptionIfDue(t: number) {
    if (G.captionUntil && t > G.captionUntil) { hud.current.setCaption(""); G.captionUntil = 0; }
  }

  function registerInteract() {
    G.lastInteract = now();
    G.hintLevel = 0;
    G.nextHintAt = G.lastInteract + 14;
  }

  function nextObjective() {
    if (!G.globeOn) {
      hud.current.setObjective("Réveille le globe céleste sur le bureau — touche-le.");
    } else if (G.anomaliesFound < 3) {
      hud.current.setObjective(`Traque les Anomalies Chronologiques cachées dans l'écho · ${G.anomaliesFound}/3`);
    } else {
      hud.current.setObjective("Le Puits de Temps est ouvert. Glisse le journal en son cœur.");
    }
  }

  // ── Interaction dispatch ─────────────────────────
  function activateGlobe() {
    if (G.globeOn || G.mode === "globe") return;
    G.mode = "globe";
    G.globeT = 0;
    globeSolid.visible = false;
    shards.visible = true;
    shards.children.forEach((c, i) => c.position.copy(shardDirs[i]).multiplyScalar(0.6));
    sfx.shatter();
    setCaption("Le globe se disloque… ses fragments refusent encore de se taire.");
    registerInteract();
  }

  function triggerRupture(idx: number) {
    const a = anomalies[idx];
    if (a.found) return;
    a.found = true;
    G.anomaliesFound++;
    hud.current.setAnomalies(G.anomaliesFound);
    G.mode = "rupture";
    G.ruptureT = 0;
    G.ruptureAnomalyIdx = idx;
    sfx.rupture();
    ghosts.visible = true;
    setCaption("Anomalie ré-ancrée. L'écho se stabilise… le passé remonte à la surface.", 9000);
    registerInteract();
  }

  function openVortex() {
    G.mode = "vortex";
    vortex.visible = true;
    hud.current.setVortexReady(true);
    sfx.collapse();
    setCaption("Le centre de l'écho cède. Un Puits de Temps s'ouvre — il réclame un tribut.", 8000);
    nextObjective();
  }

  function beginEnding() {
    G.mode = "ending";
    G.endingT = 0;
    controls.autoRotate = false;
    controls.enabled = false;
    G.realTarget = 1;
    G.sunTarget = 1;
    sfx.warm();
    // hide the journal into the vortex
    journal.visible = false;
    vortexCore.scale.setScalar(2.2);
    hud.current.setObjective("L'instant se ré-ancre dans la réalité…");
    hud.current.setCaption("");
    speak(JOURNAL_FINAL);
  }

  // ── Raycasting / pointer ─────────────────────────
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.6);
  const dragPoint = new THREE.Vector3();

  function setPointer(ev: PointerEvent) {
    const r = renderer.domElement.getBoundingClientRect();
    pointer.x = ((ev.clientX - r.left) / r.width) * 2 - 1;
    pointer.y = -((ev.clientY - r.top) / r.height) * 2 + 1;
  }

  function onPointerDown(ev: PointerEvent) {
    if (!G.started || G.mode === "ending") return;
    setPointer(ev);
    raycaster.setFromCamera(pointer, camera);

    // Drag the journal once the vortex is open
    if (G.mode === "vortex") {
      const hitJ = raycaster.intersectObject(journal, true);
      if (hitJ.length) {
        G.dragging = true;
        controls.enabled = false;
        registerInteract();
        return;
      }
    }

    // Globe
    if (!G.globeOn && G.mode === "explore") {
      const hitG = raycaster.intersectObject(globePivot, true);
      if (hitG.length) { activateGlobe(); return; }
    }

    // Anomalies (only meaningful once globe is on)
    if (G.globeOn && G.mode === "explore") {
      const hitA = raycaster.intersectObject(anomalyGroup, true);
      if (hitA.length) {
        // find which anomaly was hit
        let obj: THREE.Object3D | null = hitA[0].object;
        let idx = -1;
        while (obj && idx === -1) {
          idx = anomalies.findIndex(a => a.mesh === obj);
          obj = obj.parent;
        }
        if (idx >= 0) { triggerRupture(idx); return; }
      }
    }
  }

  function onPointerMove(ev: PointerEvent) {
    if (!G.dragging) return;
    setPointer(ev);
    raycaster.setFromCamera(pointer, camera);
    if (raycaster.ray.intersectPlane(dragPlane, dragPoint)) {
      journal.position.x = THREE.MathUtils.clamp(dragPoint.x, -4, 4);
      journal.position.z = THREE.MathUtils.clamp(dragPoint.z, -4, 4);
      journal.position.y = 0.6;
    }
  }

  function onPointerUp() {
    if (!G.dragging) return;
    G.dragging = false;
    controls.enabled = true;
    const d = Math.hypot(journal.position.x - vortex.position.x, journal.position.z - vortex.position.z);
    if (d < 0.9) {
      beginEnding();
    } else {
      // ease the journal back home
      setCaption("Le Puits attend. Amène le journal jusqu'en son cœur.", 4000);
    }
  }

  renderer.domElement.addEventListener("pointerdown", onPointerDown);
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);

  // hover cursor feedback
  function updateCursor() {
    if (G.mode === "ending" || !G.started) { renderer.domElement.style.cursor = "default"; return; }
    raycaster.setFromCamera(pointer, camera);
    let hit = false;
    if (G.mode === "vortex") hit = raycaster.intersectObject(journal, true).length > 0;
    else if (!G.globeOn) hit = raycaster.intersectObject(globePivot, true).length > 0;
    else hit = raycaster.intersectObject(anomalyGroup, true).length > 0;
    renderer.domElement.style.cursor = hit ? "pointer" : "grab";
  }
  renderer.domElement.addEventListener("pointermove", (e) => { setPointer(e as PointerEvent); });

  /* ════════════════════════════════════════════════
     MAIN LOOP
     ════════════════════════════════════════════════ */
  let raf = 0;
  function tick() {
    raf = requestAnimationFrame(tick);
    // NOTE: never call getElapsedTime() and getDelta() together — getElapsedTime
    // consumes the delta, leaving getDelta() at ~0 and freezing all dt logic.
    const dt = Math.min(clock.getDelta(), 0.05);
    elapsed += dt;
    const t = elapsed;

    // global lerps
    G.real += (G.realTarget - G.real) * Math.min(dt * 1.2, 1);
    G.sun += (G.sunTarget - G.sun) * Math.min(dt * 0.8, 1);
    for (const m of quantumMats) {
      m.uniforms.uTime.value = t;
      m.uniforms.uReal.value = G.real;
      m.uniforms.uSun.value = G.sun;
    }

    // globe spin + ring
    globePivot.rotation.y += dt * 0.3;
    ring.rotation.z += dt * 0.4;

    // debris drift
    for (const d of debrisData) {
      d.mesh.rotation.x += d.spin.x * dt;
      d.mesh.rotation.y += d.spin.y * dt;
      const drift = 1 - G.real;
      d.mesh.position.y = d.home.y + Math.sin(t * 0.5 + d.home.x) * 0.15 * drift;
      // fragments rejoin (shrink) as the world becomes real — during a rupture's
      // partial stabilisation, and fully at the ending.
      const ds = Math.max(0.001, 1 - G.real * 0.96);
      d.mesh.scale.setScalar(ds);
      // at the end, debris sinks back into solid walls
      if (G.mode === "ending") d.mesh.position.lerp(d.home.clone().multiplyScalar(1.25), dt * 0.6);
    }
    motes.rotation.y += dt * 0.02;
    (motes.material as THREE.PointsMaterial).opacity = 0.7 * (1 - G.real);

    // anomaly idle reveal (the Chronovore's nudges)
    if (G.mode === "explore" && G.globeOn) {
      // gently scale-in the next unfound anomaly so it's discoverable,
      // escalating glow the longer the player stagnates.
      const target = anomalies.find(a => !a.found);
      if (target) {
        const want = 0.6 + 0.4 * Math.sin(t * 3) * (G.hintLevel > 0 ? 1 : 0.3);
        target.mesh.scale.lerp(new THREE.Vector3(want, want, want), dt * 1.5);
        target.mesh.rotation.y += dt * 0.8;
        // stagnation → escalate hint
        if (t > G.nextHintAt) {
          G.hintLevel++;
          G.nextHintAt = t + 12;
          if (G.hintLevel === 1) setCaption("Le Chronovore observe ton hésitation… cherche ce qui ne devrait pas exister ici.");
          else setCaption(target.hint, 7000);
        }
      }
    }

    // found anomalies keep a soft presence
    for (const a of anomalies) if (a.found) { a.mesh.scale.lerp(new THREE.Vector3(0.5, 0.5, 0.5), dt); a.mesh.rotation.y += dt * 0.3; }

    // ── GLOBE sub-sequence ──
    if (G.mode === "globe") {
      G.globeT += dt;
      const shatterAmt = G.globeT < 2 ? THREE.MathUtils.clamp(G.globeT / 0.4, 0, 1) : THREE.MathUtils.clamp((2.6 - G.globeT) / 0.3, 0, 1);
      shardMat.uniforms.uShatter.value = shatterAmt * 0.9;
      shards.children.forEach((c, i) => {
        c.rotation.x += dt * 2; c.rotation.y += dt * 1.4;
        const lev = G.globeT < 2 ? 0.6 + Math.sin(t * 4 + i) * 0.12 : THREE.MathUtils.lerp(c.position.length(), 0.45, dt * 8);
        if (G.globeT < 2) c.position.copy(shardDirs[i]).multiplyScalar(lev);
        else c.position.lerp(shardDirs[i].clone().multiplyScalar(0.42), dt * 10);
      });
      if (G.globeT >= 2.6) {
        // violent reassembly + gold flash
        shards.visible = false;
        globeSolid.visible = true;
        shardMat.uniforms.uShatter.value = 0;
        sfx.suck(); sfx.chime();
        flashMat.opacity = 1.4;
        rimGold.intensity = 90;
        G.globeOn = true;
        hud.current.setGlobeOn(true);
        G.mode = "explore";
        setCaption("Le globe se ré-assemble dans un éclat doré. L'écho frémit — il te reconnaît.", 6000);
        nextObjective();
        // start gentle anomaly discovery clock
        registerInteract();
      }
    }
    // gold flash decay
    if (rimGold.intensity > 18) rimGold.intensity = THREE.MathUtils.lerp(rimGold.intensity, 18, dt * 3);
    if (flashMat.opacity > 0.001) {
      flashMat.opacity = THREE.MathUtils.lerp(flashMat.opacity, 0, dt * 2.4);
      globeFlash.scale.setScalar(1 + (1.4 - flashMat.opacity) * 0.6);
    }

    // ── RUPTURE sub-sequence (stabilise 10s, show ghosts) ──
    if (G.mode === "rupture") {
      G.ruptureT += dt;
      // ease toward "natural" stabilisation then back
      const k = G.ruptureT < 8 ? THREE.MathUtils.clamp(G.ruptureT / 1.5, 0, 0.78)
                               : THREE.MathUtils.clamp((10 - G.ruptureT) / 2, 0, 0.78);
      G.realTarget = k;
      G.sunTarget = k * 0.5;
      // ghosts fade + argue
      const gA = THREE.MathUtils.clamp((G.ruptureT - 1) * 0.8, 0, 0.82) * (G.ruptureT < 8 ? 1 : Math.max(0, (10 - G.ruptureT) / 2));
      ghostMat.opacity = gA;
      (ghostMap.material as THREE.MeshBasicMaterial).opacity = gA * 1.2;
      const arg = Math.sin(t * 6) * 0.5;
      (ghostA as any)._arm.rotation.z = (ghostA as any)._flip * (0.6 + arg);
      (ghostB as any)._arm.rotation.z = (ghostB as any)._flip * (0.6 - arg);
      ghostA.position.x = -0.7 + Math.sin(t * 3) * 0.04;
      ghostB.position.x = 0.7 - Math.sin(t * 3) * 0.04;
      if (G.ruptureT >= 10) {
        ghosts.visible = false;
        ghostMat.opacity = 0;
        G.realTarget = 0; G.sunTarget = 0;
        G.mode = "explore";
        registerInteract();
        if (G.anomaliesFound >= 3 && G.globeOn) {
          openVortex();
        } else {
          setCaption("L'écho retombe en stase. Une autre anomalie déchire encore le temps…", 6000);
          nextObjective();
        }
      }
    }

    // ── VORTEX idle animation ──
    if (vortex.visible) {
      vortex.children.forEach((c) => {
        const i = (c as any)._i;
        if (i !== undefined) { c.rotation.z += dt * (0.4 + i * 0.25); }
      });
      vortexCore.scale.setScalar(1 + Math.sin(t * 4) * 0.12);
      vortexLight.intensity = 14 + Math.sin(t * 5) * 6;
      // pull debris subtly toward the well
      if (G.mode === "vortex") {
        for (const d of debrisData) {
          const toC = vortex.position.clone().sub(d.mesh.position);
          if (toC.length() < 2.5) d.mesh.position.addScaledVector(toC, dt * 0.15);
        }
      }
      // make the draggable journal glow-pulse when vortex is open
      if (G.mode === "vortex" && !G.dragging) {
        journal.position.y = journalHomeY + Math.sin(t * 2) * 0.05;
      }
    }

    // ── ENDING cinematic ──
    if (G.mode === "ending") {
      G.endingT += dt;
      // window materialises
      windowFrame.visible = true;
      windowMat.opacity = THREE.MathUtils.clamp(G.endingT / 4, 0, 1);
      sun.intensity = THREE.MathUtils.clamp(G.endingT / 3, 0, 1) * 2.4;
      sunGlow.intensity = THREE.MathUtils.clamp(G.endingT / 3, 0, 1) * 30;
      // quantum lights fade away
      keyBlue.intensity = THREE.MathUtils.lerp(keyBlue.intensity, 2, dt * 0.6);
      // fog warms + clears
      (scene.fog as THREE.FogExp2).color.lerp(new THREE.Color("#f3e4c4"), dt * 0.4);
      (scene.fog as THREE.FogExp2).density = THREE.MathUtils.lerp((scene.fog as THREE.FogExp2).density, 0.012, dt * 0.5);
      // vortex collapses
      vortex.scale.lerp(new THREE.Vector3(0.001, 0.001, 0.001), dt * 1.2);
      vortexLight.intensity *= 0.95;
      // slow camera settle to a fixed contemplative framing
      const camTarget = new THREE.Vector3(2.4, 1.6, 6.2);
      camera.position.lerp(camTarget, dt * 0.5);
      controls.target.lerp(new THREE.Vector3(0, 1.0, 0), dt * 0.5);
      if (G.endingT > 12 && G.mode === "ending") {
        G.mode = "idle";
        hud.current.setPhase("epilogue");
      }
    }

    // stagnation first-hint scheduling in explore
    if (G.mode === "explore" && t > G.nextHintAt && G.globeOn && G.anomaliesFound < 3) {
      // handled within anomaly block above
    }

    clearCaptionIfDue(t);
    updateCursor();
    controls.update();
    if (composer) composer.render(); else renderer.render(scene, camera);
  }

  function onResize() {
    camera.aspect = W() / H();
    camera.updateProjectionMatrix();
    renderer.setSize(W(), H());
    composer?.setSize(W(), H());
    bloom?.setSize(W(), H());
  }
  window.addEventListener("resize", onResize);

  // begin idle render immediately (preview behind intro modal)
  tick();

  return {
    start() {
      if (G.started) return;
      G.started = true;
      G.mode = "explore";
      initAudio();
      // warm up speech voices
      try { window.speechSynthesis?.getVoices(); } catch { /* noop */ }
      controls.autoRotateSpeed = 0.5;
      nextObjective();
      setCaption("Tu es figé dans l'écho. Quelque part, un globe céleste attend ta main.", 6500);
      registerInteract();
    },
    replay() {
      // reset state
      G.mode = "explore"; G.globeT = -1; G.ruptureT = -1; G.endingT = -1;
      G.globeOn = false; G.anomaliesFound = 0; G.realTarget = 0; G.sunTarget = 0;
      G.dragging = false;
      anomalies.forEach(a => { a.found = false; a.mesh.scale.setScalar(0.001); });
      globeSolid.visible = true; shards.visible = false;
      vortex.visible = false; vortex.scale.setScalar(1);
      journal.visible = true; journal.position.set(-0.9, journalHomeY, 2.2);
      ghosts.visible = false; ghostMat.opacity = 0;
      windowFrame.visible = false; windowMat.opacity = 0;
      sun.intensity = 0; sunGlow.intensity = 0; keyBlue.intensity = 26;
      (scene.fog as THREE.FogExp2).color.set("#04122e");
      (scene.fog as THREE.FogExp2).density = 0.045;
      camera.position.set(0, 1.4, 8.5);
      controls.target.set(0, 1.2, 0);
      controls.enabled = true; controls.autoRotate = true;
      hud.current.setGlobeOn(false); hud.current.setVortexReady(false); hud.current.setAnomalies(0);
      nextObjective();
      setCaption("L'écho se reforme. Tu es de nouveau prisonnier de l'instant.", 6000);
      registerInteract();
    },
    dispose() {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      try { window.speechSynthesis?.cancel(); } catch { /* noop */ }
      try { droneNodes?.osc.forEach(o => o.stop()); actx?.close(); } catch { /* noop */ }
      controls.dispose();
      scene.traverse(obj => {
        const m = obj as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        const mat = (m as any).material;
        if (Array.isArray(mat)) mat.forEach((x: THREE.Material) => x.dispose());
        else if (mat) mat.dispose();
      });
      composer?.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    },
  };
}

/* ════════════════════════════════════════════════════════════════════════
   STYLES
   ════════════════════════════════════════════════════════════════════════ */
const CHRONO_CSS = `
.chrono-root{position:fixed;inset:0;background:#02060f;overflow:hidden;font-family:var(--font-b,system-ui);}
.chrono-canvas{position:absolute;inset:0;width:100%;height:100%;touch-action:none;}
.chrono-canvas canvas{display:block;}

.chrono-hud{position:absolute;inset:0;pointer-events:none;z-index:5;}
.chrono-exit{position:absolute;top:14px;right:14px;width:42px;height:42px;border-radius:50%;
  background:rgba(10,20,40,.55);border:1px solid rgba(140,180,255,.35);color:#cfe2ff;font-size:1.1rem;
  cursor:pointer;pointer-events:auto;backdrop-filter:blur(6px);transition:.2s;}
.chrono-exit:hover{background:rgba(40,60,110,.8);transform:scale(1.06);}
.chrono-objective{position:absolute;top:16px;left:50%;transform:translateX(-50%);text-align:center;
  background:linear-gradient(180deg,rgba(8,16,36,.7),rgba(8,16,36,.35));border:1px solid rgba(120,170,255,.28);
  padding:.55rem 1.3rem;border-radius:999px;backdrop-filter:blur(8px);max-width:90vw;}
.chrono-obj-label{display:block;font-size:.62rem;letter-spacing:.28em;text-transform:uppercase;color:#7fb0ff;margin-bottom:2px;}
.chrono-obj-text{display:block;color:#eaf2ff;font-size:.95rem;font-weight:700;text-shadow:0 0 12px rgba(80,150,255,.5);}
.chrono-status{position:absolute;bottom:18px;left:50%;transform:translateX(-50%);display:flex;gap:.5rem;flex-wrap:wrap;justify-content:center;}
.chrono-pill{background:rgba(10,20,42,.6);border:1px solid rgba(120,170,255,.25);color:#bcd6ff;
  font-size:.78rem;font-weight:700;padding:.35rem .8rem;border-radius:999px;backdrop-filter:blur(6px);}
.chrono-pill.done{border-color:rgba(255,200,90,.6);color:#ffd98a;box-shadow:0 0 16px rgba(255,190,70,.25);}
.chrono-pill.vortex{border-color:rgba(160,220,255,.7);color:#dff1ff;animation:chronoPulse 1.6s infinite;}
@keyframes chronoPulse{0%,100%{box-shadow:0 0 8px rgba(120,200,255,.3);}50%{box-shadow:0 0 22px rgba(120,200,255,.7);}}
.chrono-caption{position:absolute;bottom:64px;left:50%;transform:translateX(-50%);max-width:80vw;text-align:center;
  color:#dce8ff;font-style:italic;font-size:1.02rem;line-height:1.5;text-shadow:0 2px 18px rgba(0,0,0,.9),0 0 24px rgba(70,140,255,.4);
  animation:chronoFade .8s ease;}
@keyframes chronoFade{from{opacity:0;transform:translate(-50%,10px);}to{opacity:1;transform:translate(-50%,0);}}

.chrono-overlay{position:absolute;inset:0;z-index:10;display:flex;align-items:center;justify-content:center;padding:1.2rem;
  background:radial-gradient(ellipse at 50% 40%,rgba(20,40,90,.55),rgba(2,6,16,.92));backdrop-filter:blur(3px);
  animation:chronoFade .9s ease;overflow:auto;}
.chrono-overlay.epilogue{background:radial-gradient(ellipse at 50% 40%,rgba(120,90,40,.4),rgba(20,12,4,.94));}
.chrono-modal{max-width:540px;width:100%;text-align:center;background:linear-gradient(180deg,rgba(12,22,48,.92),rgba(6,12,30,.96));
  border:1px solid rgba(120,170,255,.35);border-radius:1.4rem;padding:2rem 1.8rem;
  box-shadow:0 0 60px rgba(50,110,220,.35),inset 0 0 40px rgba(40,90,200,.1);}
.chrono-modal.warm{background:linear-gradient(180deg,rgba(48,34,16,.95),rgba(26,18,8,.97));border-color:rgba(255,200,120,.4);
  box-shadow:0 0 60px rgba(220,170,80,.35);}
.chrono-glyph{font-size:3rem;filter:drop-shadow(0 0 18px rgba(120,180,255,.7));margin-bottom:.4rem;}
.chrono-title{font-family:var(--font-d,serif);font-size:2.4rem;background:linear-gradient(90deg,#8fc0ff,#ffd98a);
  -webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;letter-spacing:.02em;margin-bottom:.1rem;}
.chrono-title.warm{background:linear-gradient(90deg,#ffd98a,#ffb070);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;}
.chrono-sub{color:#9fb8e6;letter-spacing:.34em;text-transform:uppercase;font-size:.74rem;margin-bottom:1.1rem;}
.chrono-sub.warm{color:#e6c79a;}
.chrono-lore{color:#cdd9f0;font-size:.98rem;line-height:1.65;margin-bottom:1.1rem;}
.chrono-lore em{color:#ffd98a;font-style:italic;}
.chrono-hints{list-style:none;text-align:left;display:inline-block;margin:0 auto 1.3rem;color:#a9c0e6;font-size:.86rem;line-height:2;}
.chrono-journal{color:#f0dcb6;font-size:1.02rem;line-height:1.75;font-style:italic;margin-bottom:1.1rem;text-align:left;
  border-left:2px solid rgba(255,200,120,.4);padding-left:1rem;}
.chrono-enter{background:linear-gradient(90deg,#3a7bd5,#6a4bd0);color:#fff;border:none;border-radius:999px;
  padding:.85rem 2rem;font-size:1.05rem;font-weight:800;cursor:pointer;box-shadow:0 8px 30px rgba(60,110,220,.5);
  transition:.2s;letter-spacing:.02em;}
.chrono-enter:hover{transform:translateY(-2px);box-shadow:0 12px 40px rgba(60,110,220,.7);}
.chrono-skip{display:block;margin:.9rem auto 0;background:none;border:none;color:#8da6cf;cursor:pointer;
  font-size:.85rem;text-decoration:underline;text-underline-offset:3px;}
.chrono-end-btns{display:flex;gap:.8rem;justify-content:center;flex-wrap:wrap;align-items:center;}
.chrono-end-btns .chrono-skip{margin:0;}
.chrono-err{color:#ff9a9a;font-size:.9rem;margin-top:.6rem;}
@media (max-width:520px){.chrono-title{font-size:1.9rem;}.chrono-lore{font-size:.9rem;}.chrono-obj-text{font-size:.82rem;}}
`;
