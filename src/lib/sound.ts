/** Moteur audio + haptics de KHELIJ. Sons SYNTHÉTISÉS via Web Audio (aucun
 *  fichier à télécharger, fonctionne hors-ligne). Chaque effet déclenche aussi
 *  une vibration mobile adaptée. Bouton muet global, persistant. */

type FxName =
  | "tap" | "select" | "place" | "correct" | "wrong" | "tick" | "warn"
  | "explode" | "victory" | "vote" | "point" | "swap" | "start";

const MUTE_KEY = "khelij_muted";
let muted = (() => { try { return localStorage.getItem(MUTE_KEY) === "1"; } catch { return false; } })();

let ctx: AudioContext | null = null;
function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    try { ctx = new AC(); } catch { return null; }
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

function tone(freq: number, delay: number, dur: number, type: OscillatorType = "sine", vol = 0.2, endFreq?: number) {
  const c = ac(); if (!c) return;
  const t0 = c.currentTime + delay;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (endFreq) osc.frequency.exponentialRampToValueAtTime(Math.max(1, endFreq), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(vol, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g); g.connect(c.destination);
  osc.start(t0); osc.stop(t0 + dur + 0.03);
}

function noise(delay: number, dur: number, vol = 0.3) {
  const c = ac(); if (!c) return;
  const t0 = c.currentTime + delay;
  const n = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, n, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const src = c.createBufferSource(); src.buffer = buf;
  const g = c.createGain();
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(g); g.connect(c.destination);
  src.start(t0);
}

const PRESETS: Record<FxName, () => void> = {
  tap:     () => tone(620, 0, 0.05, "triangle", 0.10),
  select:  () => tone(480, 0, 0.08, "sine", 0.13),
  place:   () => { tone(190, 0, 0.12, "square", 0.16, 120); },
  swap:    () => { tone(300, 0, 0.07, "triangle", 0.12); tone(240, 0.06, 0.09, "triangle", 0.10); },
  correct: () => { tone(523, 0, 0.12, "sine", 0.16); tone(659, 0.09, 0.12, "sine", 0.16); tone(784, 0.18, 0.18, "sine", 0.18); },
  wrong:   () => tone(240, 0, 0.28, "sawtooth", 0.18, 90),
  tick:    () => tone(1150, 0, 0.03, "square", 0.07),
  warn:    () => tone(880, 0, 0.11, "square", 0.13),
  explode: () => { noise(0, 0.4, 0.35); tone(80, 0, 0.42, "sawtooth", 0.28, 40); },
  victory: () => { [523, 659, 784, 1046].forEach((f, i) => tone(f, i * 0.11, 0.24, "triangle", 0.18)); },
  vote:    () => { tone(520, 0, 0.06, "sine", 0.13); tone(720, 0.05, 0.09, "sine", 0.12); },
  point:   () => { tone(784, 0, 0.07, "triangle", 0.16); tone(1046, 0.07, 0.12, "triangle", 0.16); },
  start:   () => { tone(392, 0, 0.1, "triangle", 0.15); tone(587, 0.1, 0.16, "triangle", 0.16); },
};

const HAPTICS: Partial<Record<FxName, number | number[]>> = {
  tap: 8, select: 10, place: 15, swap: 12,
  correct: [0, 25, 35, 25], wrong: 55, warn: 30,
  explode: [0, 70, 40, 110], victory: [0, 40, 55, 40, 55, 80],
  vote: 18, point: 20, start: 25,
};

export function vibrate(pattern: number | number[]) {
  try { if (!muted && typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(pattern); } catch { /* ignore */ }
}

/** Joue un effet (son + vibration). Silencieux si l'utilisateur a coupé le son. */
export function fx(name: FxName) {
  // Journal de test (permet d'observer les déclenchements en environnement headless).
  try { (window as unknown as { __fxLog?: string[] }).__fxLog?.push(name); } catch { /* ignore */ }
  if (muted) return;
  try { PRESETS[name]?.(); } catch { /* ignore */ }
  const h = HAPTICS[name];
  if (h !== undefined) vibrate(h);
}

export function isMuted() { return muted; }
export function setMuted(v: boolean) {
  muted = v;
  try { localStorage.setItem(MUTE_KEY, v ? "1" : "0"); } catch { /* ignore */ }
}
export function toggleMuted() { setMuted(!muted); return muted; }
