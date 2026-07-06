/* ══════════════════════════════════════════════════════════════════════════
   MOTEUR UNO — jeu de 108 cartes, règles officielles, état sérialisable + PUR.
   Couleurs r/y/g/b, chiffres 0–9, Passe (skip), Sens (rev), +2, Joker (wild),
   +4 (wd4). Sens de jeu, choix de couleur des jokers, +2/+4, « UNO ! », pioche
   qui se remélange, victoire à main vide. IA incluse.
   ══════════════════════════════════════════════════════════════════════════ */

export type UColor = "r" | "y" | "g" | "b" | "w";
export type UValue = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "skip" | "rev" | "d2" | "wild" | "wd4";
export interface UCard { c: UColor; v: UValue; }

export const COLORS: UColor[] = ["r", "y", "g", "b"];
export const COLOR_HEX: Record<UColor, string> = { r: "#e0403f", y: "#f4c430", g: "#2fa66a", b: "#3b6fe0", w: "#2b2f3a" };
export const COLOR_NAME: Record<UColor, string> = { r: "Rouge", y: "Jaune", g: "Vert", b: "Bleu", w: "Joker" };

export interface UnoState {
  order: string[];
  hands: Record<string, UCard[]>;
  draw: UCard[];
  discard: UCard[];            // dernière carte = dessus
  activeColor: UColor;         // couleur en cours (gère les jokers)
  turn: number;
  dir: 1 | -1;
  saidUno: Record<string, boolean>;
  drewPlayable: boolean;       // vient de piocher une carte jouable → peut la jouer ou passer
  log: string[];
  phase: "play" | "over";
  winner: string | null;
}

export const label = (card: UCard): string => {
  const v = card.v;
  if (v === "skip") return "⃠"; if (v === "rev") return "⇄"; if (v === "d2") return "+2";
  if (v === "wild") return "★"; if (v === "wd4") return "+4"; return v;
};

export function buildDeck(rnd: () => number): UCard[] {
  const d: UCard[] = [];
  for (const c of COLORS) {
    d.push({ c, v: "0" });
    for (let n = 1; n <= 9; n++) { d.push({ c, v: String(n) as UValue }); d.push({ c, v: String(n) as UValue }); }
    for (const a of ["skip", "rev", "d2"] as UValue[]) { d.push({ c, v: a }); d.push({ c, v: a }); }
  }
  for (let i = 0; i < 4; i++) { d.push({ c: "w", v: "wild" }); d.push({ c: "w", v: "wd4" }); }
  for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [d[i], d[j]] = [d[j], d[i]]; }
  return d;
}

const clone = (s: UnoState): UnoState => ({
  ...s,
  hands: Object.fromEntries(Object.entries(s.hands).map(([k, v]) => [k, v.map(c => ({ ...c }))])),
  draw: s.draw.map(c => ({ ...c })), discard: s.discard.map(c => ({ ...c })),
  saidUno: { ...s.saidUno }, log: [...s.log], order: [...s.order],
});
const log = (s: UnoState, m: string) => { s.log = [...s.log.slice(-14), m]; };
export const top = (s: UnoState): UCard => s.discard[s.discard.length - 1];
export const currentId = (s: UnoState): string => s.order[s.turn];

export function initUno(order: string[], rnd: () => number): UnoState {
  const deck = buildDeck(rnd);
  const hands: Record<string, UCard[]> = {};
  const saidUno: Record<string, boolean> = {};
  order.forEach(id => { hands[id] = deck.splice(0, 7); saidUno[id] = false; });
  // Première carte : on évite un joker au départ.
  let first = deck.shift()!;
  while (first.c === "w") { deck.push(first); first = deck.shift()!; }
  const s: UnoState = {
    order: [...order], hands, draw: deck, discard: [first], activeColor: first.c,
    turn: 0, dir: 1, saidUno, drewPlayable: false, log: ["La partie commence !"], phase: "play", winner: null,
  };
  applyStartCard(s);
  return s;
}

/* Effet de la toute première carte (skip/rev/+2 possibles). */
function applyStartCard(s: UnoState) {
  const t = top(s);
  if (t.v === "rev") { s.dir = -1; if (s.order.length === 2) advance(s); }
  else if (t.v === "skip") advance(s);
  else if (t.v === "d2") { const nxt = peekNext(s); s.hands[nxt].push(...take(s, 2)); advance(s); }
}

function refillIfNeeded(s: UnoState) {
  if (s.draw.length === 0 && s.discard.length > 1) {
    const keep = s.discard.pop()!;
    s.draw = s.discard;
    s.discard = [keep];
    // remélange (déterministe simple)
    for (let i = s.draw.length - 1; i > 0; i--) { const j = (i * 9301 + 49297) % (i + 1); [s.draw[i], s.draw[j]] = [s.draw[j], s.draw[i]]; }
    log(s, "La pioche est remélangée.");
  }
}
function take(s: UnoState, n: number): UCard[] {
  const out: UCard[] = [];
  for (let i = 0; i < n; i++) { refillIfNeeded(s); if (s.draw.length) out.push(s.draw.shift()!); }
  return out;
}
const nextIdx = (s: UnoState, from = s.turn) => (from + s.dir + s.order.length) % s.order.length;
const peekNext = (s: UnoState) => s.order[nextIdx(s)];
function advance(s: UnoState) { s.turn = nextIdx(s); }

/** Une carte est-elle jouable sur l'état courant ? (règle du +4 incluse). */
export function playable(s: UnoState, pid: string, card: UCard): boolean {
  const t = top(s);
  if (card.v === "wd4") {
    // Légal seulement si aucune carte de la couleur active en main.
    return !s.hands[pid].some(x => x.c === s.activeColor);
  }
  if (card.c === "w") return true; // joker simple
  return card.c === s.activeColor || card.v === t.v;
}

/* ── Transitions ── */

/** Joue la carte d'indice `idx` de la main du joueur courant. `color` = couleur
 *  choisie pour un joker. `uno` = le joueur a crié UNO en jouant. */
export function playCard(state: UnoState, idx: number, color: UColor | null, uno: boolean): UnoState {
  const s = clone(state);
  if (s.phase !== "play") return s;
  const pid = currentId(s);
  const hand = s.hands[pid];
  const card = hand[idx];
  if (!card || !playable(s, pid, card)) return s;

  hand.splice(idx, 1);
  s.discard.push(card);
  s.activeColor = card.c === "w" ? (color || "r") : card.c;
  s.drewPlayable = false;
  s.saidUno[pid] = uno && hand.length === 1;
  log(s, `${pid} joue ${card.c === "w" ? "un joker" : label(card)}${card.c === "w" ? ` (${COLOR_NAME[s.activeColor]})` : ""}.`);

  // Pénalité UNO oublié.
  if (hand.length === 1 && !s.saidUno[pid]) { hand.push(...take(s, 2)); log(s, `${pid} a oublié de dire UNO → +2 !`); }

  // Victoire.
  if (hand.length === 0) { s.phase = "over"; s.winner = pid; log(s, `🎉 ${pid} gagne la partie !`); return s; }

  // Effets.
  switch (card.v) {
    case "skip": advance(s); advance(s); break;
    case "rev": s.dir = (s.dir === 1 ? -1 : 1); if (s.order.length === 2) { advance(s); advance(s); } else advance(s); break;
    case "d2": { const nxt = peekNext(s); s.hands[nxt].push(...take(s, 2)); advance(s); advance(s); break; }
    case "wd4": { const nxt = peekNext(s); s.hands[nxt].push(...take(s, 4)); advance(s); advance(s); break; }
    default: advance(s);
  }
  return s;
}

/** Le joueur courant pioche une carte. S'il peut la jouer, il garde la main
 *  (drewPlayable) ; sinon le tour passe. */
export function drawTurn(state: UnoState): UnoState {
  const s = clone(state);
  if (s.phase !== "play") return s;
  const pid = currentId(s);
  const [card] = take(s, 1);
  if (!card) return s;
  s.hands[pid].push(card);
  log(s, `${pid} pioche une carte.`);
  if (playable(s, pid, card)) { s.drewPlayable = true; }
  else { s.drewPlayable = false; advance(s); }
  return s;
}

/** Passer après avoir pioché (on ne joue pas la carte piochée). */
export function passTurn(state: UnoState): UnoState {
  const s = clone(state);
  if (s.phase !== "play") return s;
  s.drewPlayable = false;
  advance(s);
  return s;
}

/** Crier UNO (arme la protection ; sans effet si main ≠ 2 à ce moment). */
export function callUno(state: UnoState): UnoState {
  const s = clone(state);
  const pid = currentId(s);
  if (s.hands[pid].length === 2) { s.saidUno[pid] = true; log(s, `${pid} : UNO !`); }
  return s;
}

/* ── IA : joue un coup. ── */
export function aiPlay(state: UnoState, rnd: () => number): UnoState {
  let s = state;
  const pid = currentId(s);
  const hand = s.hands[pid];
  // Cartes jouables (on garde les +4 en dernier recours).
  const idxs = hand.map((c, i) => i).filter(i => playable(s, pid, hand[i]));
  const order = idxs.sort((a, b) => score(hand[a]) - score(hand[b]));
  if (order.length === 0) {
    s = drawTurn(s);
    // Si la carte piochée est jouable, on la joue.
    if (s.phase === "play" && s.drewPlayable && currentId(s) === pid) {
      const h = s.hands[pid];
      const i = h.map((c, k) => k).find(k => playable(s, pid, h[k]));
      if (i != null) return playCard(s, i, pickColor(h), true);
      return passTurn(s);
    }
    return s;
  }
  const chosen = order[0];
  return playCard(s, chosen, pickColor(hand), true);
}
function score(c: UCard): number { // priorité : chiffres < actions couleur < jokers < +4
  if (c.v === "wd4") return 4; if (c.v === "wild") return 3;
  if (c.v === "skip" || c.v === "rev" || c.v === "d2") return 2; return 1;
}
function pickColor(hand: UCard[]): UColor {
  const cnt: Record<string, number> = { r: 0, y: 0, g: 0, b: 0 };
  hand.forEach(c => { if (c.c !== "w") cnt[c.c]++; });
  return (COLORS.sort((a, b) => cnt[b] - cnt[a])[0]) || "r";
}
