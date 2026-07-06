import {
  BOARD, CHANCE, CHEST, SALARY, JAIL_INDEX, GOTOJAIL_INDEX, JAIL_FINE, START_MONEY,
  MAX_HOUSES, RAIL_RENT, UTIL_MULT, type Card,
} from "./monopolyData";

/* ══════════════════════════════════════════════════════════════════════════
   MOTEUR MONOPOLY — état sérialisable (stocké dans la room) + transitions PURES.
   Phases : "roll" (lancer / décision de prison) → "buy" (acheter la case) →
   "manage" (construire / finir) → tour suivant. "over" en fin de partie.
   ══════════════════════════════════════════════════════════════════════════ */

export interface MPlayer {
  id: string; money: number; pos: number;
  jail: number;      // -1 = libre ; 0..2 = tours passés en prison
  getout: number;    // cartes « sortie de prison »
  bankrupt: boolean;
}
export interface MonoState {
  order: string[];
  players: Record<string, MPlayer>;
  owners: Record<number, string>;   // case → propriétaire
  houses: Record<number, number>;   // case → nb maisons (5 = hôtel)
  turn: number;                     // index dans order (joueurs non-faillis)
  dice: [number, number];
  doubles: number;                  // doubles consécutifs ce tour
  rolledDoubles: boolean;
  phase: "roll" | "buy" | "manage" | "over";
  pendingBuy: number | null;
  chanceDeck: number[]; chancePtr: number;
  chestDeck: number[]; chestPtr: number;
  log: string[];
  card: string | null;              // dernière carte tirée (pour affichage)
  winner: string | null;
}

const clone = (s: MonoState): MonoState => ({
  ...s,
  players: Object.fromEntries(Object.entries(s.players).map(([k, v]) => [k, { ...v }])),
  owners: { ...s.owners }, houses: { ...s.houses },
  dice: [s.dice[0], s.dice[1]], chanceDeck: [...s.chanceDeck], chestDeck: [...s.chestDeck],
  log: [...s.log], order: [...s.order],
});
const shuffle = (n: number, rnd: () => number) => {
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};
const log = (s: MonoState, m: string) => { s.log = [...s.log.slice(-14), m]; };
const name = (id: string) => id; // le composant traduit id→nom pour l'affichage

export function initMono(order: string[], rnd: () => number): MonoState {
  const players: Record<string, MPlayer> = {};
  order.forEach(id => { players[id] = { id, money: START_MONEY, pos: 0, jail: -1, getout: 0, bankrupt: false }; });
  return {
    order: [...order], players, owners: {}, houses: {}, turn: 0,
    dice: [1, 1], doubles: 0, rolledDoubles: false, phase: "roll", pendingBuy: null,
    chanceDeck: shuffle(CHANCE.length, rnd), chancePtr: 0,
    chestDeck: shuffle(CHEST.length, rnd), chestPtr: 0,
    log: ["La partie commence !"], card: null, winner: null,
  };
}

export const currentId = (s: MonoState): string => s.order[s.turn % s.order.length];
const alive = (s: MonoState) => s.order.filter(id => !s.players[id].bankrupt);

/* Combien de gares / compagnies possède un joueur. */
function countGroup(s: MonoState, pid: string, group: string): number {
  return BOARD.filter(sp => sp.group === group && s.owners[sp.i] === pid).length;
}
function ownsFullSet(s: MonoState, pid: string, group: string): boolean {
  const set = BOARD.filter(sp => sp.group === group);
  return set.length > 0 && set.every(sp => s.owners[sp.i] === pid);
}

/* Loyer dû sur une case possédée par un autre. */
export function rentDue(s: MonoState, i: number, diceSum: number): number {
  const sp = BOARD[i];
  const owner = s.owners[i];
  if (!owner) return 0;
  if (sp.type === "rail") return RAIL_RENT[Math.max(0, countGroup(s, owner, "rail") - 1)] || 0;
  if (sp.type === "util") { const n = countGroup(s, owner, "util"); return diceSum * (UTIL_MULT[Math.max(0, n - 1)] || 4); }
  if (sp.type === "prop" && sp.rent) {
    const h = s.houses[i] || 0;
    if (h === 0) return ownsFullSet(s, owner, sp.group!) ? sp.rent[0] * 2 : sp.rent[0];
    return sp.rent[h];
  }
  return 0;
}

/* Valeur de liquidation (moitié des maisons) pour tenter d'éviter la faillite. */
function liquidate(s: MonoState, pid: string, need: number) {
  for (const sp of BOARD) {
    if (s.players[pid].money >= need) break;
    if (s.owners[sp.i] === pid && (s.houses[sp.i] || 0) > 0 && sp.house) {
      const sell = Math.floor(sp.house / 2) * (s.houses[sp.i] || 0);
      s.houses[sp.i] = 0;
      s.players[pid].money += sell;
      log(s, `${name(pid)} revend des maisons (+${sell}).`);
    }
  }
}

/* Paiement (banque ou vers un créancier). Gère liquidation + faillite. */
function pay(s: MonoState, pid: string, amount: number, toId?: string) {
  const p = s.players[pid];
  if (p.money < amount) liquidate(s, pid, amount);
  if (p.money < amount) {
    // Faillite : tout va au créancier (ou à la banque).
    p.bankrupt = true;
    log(s, `💥 ${name(pid)} fait faillite !`);
    for (const sp of BOARD) if (s.owners[sp.i] === pid) {
      if (toId) s.owners[sp.i] = toId; else delete s.owners[sp.i];
      s.houses[sp.i] = 0;
    }
    if (toId) { s.players[toId].money += Math.max(0, p.money); }
    p.money = 0;
    return;
  }
  p.money -= amount;
  if (toId) s.players[toId].money += amount;
}

function goToJail(s: MonoState, pid: string) {
  s.players[pid].pos = JAIL_INDEX;
  s.players[pid].jail = 0;
  s.rolledDoubles = false;
  log(s, `🚔 ${name(pid)} va en prison !`);
}

/* Déplace un joueur vers une case absolue (gère le passage par Départ). */
function moveTo(s: MonoState, pid: string, dest: number, passGo = true) {
  const p = s.players[pid];
  if (passGo && dest <= p.pos && dest !== p.pos) { p.money += SALARY; log(s, `${name(pid)} passe par Départ (+${SALARY}).`); }
  else if (passGo && dest < p.pos) { p.money += SALARY; }
  p.pos = dest;
}

/* Résout l'arrivée sur une case (après déplacement). */
function resolveLanding(s: MonoState, pid: string, diceSum: number) {
  const p = s.players[pid];
  const sp = BOARD[p.pos];
  s.pendingBuy = null;
  s.phase = "manage";

  if (sp.type === "prop" || sp.type === "rail" || sp.type === "util") {
    const owner = s.owners[p.pos];
    if (!owner) { s.pendingBuy = p.pos; s.phase = "buy"; return; }
    if (owner !== pid) {
      const rent = rentDue(s, p.pos, diceSum);
      log(s, `${name(pid)} paie ${rent} de loyer à ${name(owner)}.`);
      pay(s, pid, rent, owner);
    }
    return;
  }
  if (sp.type === "tax") { log(s, `${name(pid)} paie ${sp.tax} d'impôts.`); pay(s, pid, sp.tax || 0); return; }
  if (sp.type === "gotojail") { goToJail(s, pid); s.phase = "manage"; return; }
  if (sp.type === "chance") { drawCard(s, pid, "chance", diceSum); return; }
  if (sp.type === "chest") { drawCard(s, pid, "chest", diceSum); return; }
  // go / parking / jail(visite) → rien
}

function drawCard(s: MonoState, pid: string, deck: "chance" | "chest", diceSum: number) {
  const cards = deck === "chance" ? CHANCE : CHEST;
  const order = deck === "chance" ? s.chanceDeck : s.chestDeck;
  const ptr = deck === "chance" ? s.chancePtr : s.chestPtr;
  const card: Card = cards[order[ptr % order.length]];
  if (deck === "chance") s.chancePtr = (ptr + 1) % order.length; else s.chestPtr = (ptr + 1) % order.length;
  s.card = card.text;
  log(s, `🃏 ${name(pid)} : ${card.text}`);
  const p = s.players[pid];
  switch (card.kind) {
    case "money": (card.amount || 0) >= 0 ? (p.money += card.amount || 0) : pay(s, pid, -(card.amount || 0)); break;
    case "getout": p.getout += 1; break;
    case "jail": goToJail(s, pid); break;
    case "goto": moveTo(s, pid, card.amount || 0, true); resolveLanding(s, pid, diceSum); break;
    case "move": { let np = (p.pos + (card.amount || 0) + 40) % 40; p.pos = np; resolveLanding(s, pid, diceSum); break; }
    case "repairs": {
      let cost = 0;
      for (const sp of BOARD) if (s.owners[sp.i] === pid) { const h = s.houses[sp.i] || 0; cost += h === MAX_HOUSES ? 100 : h * 25; }
      if (cost > 0) { log(s, `${name(pid)} paie ${cost} de réparations.`); pay(s, pid, cost); }
      break;
    }
  }
}

/* ── Transitions publiques (le composant les appelle) ── */

export function rollDice(state: MonoState, rnd: () => number): MonoState {
  const s = clone(state);
  if (s.phase !== "roll") return s;
  const pid = currentId(s);
  const p = s.players[pid];
  const d: [number, number] = [1 + Math.floor(rnd() * 6), 1 + Math.floor(rnd() * 6)];
  s.dice = d;
  const sum = d[0] + d[1];
  const isDouble = d[0] === d[1];
  s.card = null;

  if (p.jail >= 0) { // en prison
    if (isDouble) { p.jail = -1; log(s, `${name(pid)} fait un double et sort de prison !`); s.rolledDoubles = false; moveStep(s, pid, sum); return s; }
    p.jail += 1;
    if (p.jail >= 3) { log(s, `${name(pid)} paie ${JAIL_FINE} et sort de prison.`); pay(s, pid, JAIL_FINE); p.jail = -1; moveStep(s, pid, sum); return s; }
    log(s, `${name(pid)} rate le double (tour ${p.jail}/3 en prison).`);
    s.phase = "manage"; s.rolledDoubles = false;
    return s;
  }

  if (isDouble) {
    s.doubles += 1;
    if (s.doubles >= 3) { log(s, `${name(pid)} fait 3 doubles → en prison !`); goToJail(s, pid); s.phase = "manage"; return s; }
    s.rolledDoubles = true;
  } else s.rolledDoubles = false;

  moveStep(s, pid, sum);
  return s;
}

function moveStep(s: MonoState, pid: string, sum: number) {
  const p = s.players[pid];
  const np = (p.pos + sum) % 40;
  if (np < p.pos) { p.money += SALARY; log(s, `${name(pid)} passe par Départ (+${SALARY}).`); }
  p.pos = np;
  log(s, `${name(pid)} avance sur « ${BOARD[np].short} ».`);
  resolveLanding(s, pid, sum);
}

export function buyProperty(state: MonoState): MonoState {
  const s = clone(state);
  if (s.phase !== "buy" || s.pendingBuy == null) return s;
  const pid = currentId(s); const sp = BOARD[s.pendingBuy];
  if (s.players[pid].money >= (sp.price || 0)) {
    s.players[pid].money -= sp.price || 0;
    s.owners[s.pendingBuy] = pid;
    log(s, `${name(pid)} achète « ${sp.short} » (${sp.price}).`);
  }
  s.pendingBuy = null; s.phase = "manage";
  return s;
}
export function declineBuy(state: MonoState): MonoState {
  const s = clone(state);
  if (s.phase !== "buy") return s;
  s.pendingBuy = null; s.phase = "manage";
  return s;
}

/* Construit une maison (ou un hôtel) sur une case, si règles respectées. */
export function buildHouse(state: MonoState, i: number): MonoState {
  const s = clone(state);
  const pid = currentId(s); const sp = BOARD[i];
  if (s.phase !== "manage" || sp.type !== "prop" || s.owners[i] !== pid) return s;
  if (!ownsFullSet(s, pid, sp.group!)) return s;
  const h = s.houses[i] || 0;
  if (h >= MAX_HOUSES) return s;
  // Construction régulière : on ne dépasse pas de +1 le minimum du groupe.
  const groupMin = Math.min(...BOARD.filter(x => x.group === sp.group).map(x => s.houses[x.i] || 0));
  if (h > groupMin) return s;
  if (s.players[pid].money < (sp.house || 0)) return s;
  s.players[pid].money -= sp.house || 0;
  s.houses[i] = h + 1;
  log(s, `${name(pid)} construit sur « ${sp.short} » (${h + 1 === MAX_HOUSES ? "hôtel" : (h + 1) + " maison(s)"}).`);
  return s;
}

export function endTurn(state: MonoState): MonoState {
  let s = clone(state);
  if (s.phase === "over") return s;
  const pid = currentId(s);
  // Fin de partie : un seul joueur solvable.
  const survivors = alive(s);
  if (survivors.length <= 1) { s.phase = "over"; s.winner = survivors[0] || null; return s; }
  // Rejoue si double (et pas en prison) sinon joueur suivant.
  if (s.rolledDoubles && !s.players[pid].bankrupt && s.players[pid].jail < 0) {
    s.rolledDoubles = false; s.phase = "roll"; s.card = null; return s;
  }
  s.doubles = 0; s.rolledDoubles = false; s.card = null;
  // Avance jusqu'au prochain joueur non-failli.
  do { s.turn = (s.turn + 1) % s.order.length; } while (s.players[currentId(s)].bankrupt);
  s.phase = "roll";
  return s;
}

/* ── IA : joue un tour complet (retourne le nouvel état). ── */
export function aiTurn(state: MonoState, rnd: () => number): MonoState {
  let s = state;
  const pid = currentId(s);
  const p = s.players[pid];
  // Prison : paie si riche, sinon tente le double (via roll).
  if (s.phase === "roll") {
    if (p.jail >= 0 && p.money > 300 && p.getout === 0) { /* laisse rollDice tenter le double d'abord */ }
    s = rollDice(s, rnd);
  }
  // Décision d'achat : achète si abordable et garde un coussin.
  if (s.phase === "buy" && s.pendingBuy != null) {
    const sp = BOARD[s.pendingBuy];
    s = s.players[currentId(s)].money - (sp.price || 0) > 120 ? buyProperty(s) : declineBuy(s);
  }
  // Construction : bâtit sur les sets complets tant qu'il reste du cash.
  if (s.phase === "manage") {
    let built = true;
    while (built) {
      built = false;
      for (const sp of BOARD) {
        if (sp.type !== "prop" || s.owners[sp.i] !== pid) continue;
        if (!ownsFullSetPublic(s, pid, sp.group!)) continue;
        if (s.players[pid].money - (sp.house || 0) < 250) continue;
        const before = s.houses[sp.i] || 0;
        const ns = buildHouse(s, sp.i);
        if ((ns.houses[sp.i] || 0) > before) { s = ns; built = true; break; }
      }
    }
  }
  return endTurn(s);
}
function ownsFullSetPublic(s: MonoState, pid: string, group: string): boolean {
  const set = BOARD.filter(sp => sp.group === group);
  return set.length > 0 && set.every(sp => s.owners[sp.i] === pid);
}

export { ownsFullSet, countGroup };
