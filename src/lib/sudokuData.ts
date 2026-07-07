/* ══════════════════════════════════════════════════════════════════════════
   SUDOKU — génération d'une grille pleine valide (backtracking randomisé) puis
   retrait de cases en garantissant une SOLUTION UNIQUE (solveur MRV comptant
   jusqu'à 2 solutions). Tout est pur → testable et rapide, même sur mobile.
   Grille = tableau de 81 entiers (0 = vide), index i : ligne i/9, colonne i%9.
   ══════════════════════════════════════════════════════════════════════════ */

export type SGrid = number[];
export type SDiff = "facile" | "moyen" | "difficile";

const ROW = (i: number) => Math.floor(i / 9);
const COL = (i: number) => i % 9;
const BOX = (i: number) => Math.floor(ROW(i) / 3) * 3 + Math.floor(COL(i) / 3);

/** Valeurs possibles pour la case i, compte tenu de la ligne/colonne/bloc. */
function candidates(g: SGrid, i: number): number[] {
  const r = ROW(i), c = COL(i), b = BOX(i);
  const used = new Set<number>();
  for (let k = 0; k < 81; k++) {
    if (g[k] === 0) continue;
    if (ROW(k) === r || COL(k) === c || BOX(k) === b) used.add(g[k]);
  }
  const out: number[] = [];
  for (let v = 1; v <= 9; v++) if (!used.has(v)) out.push(v);
  return out;
}

/** Case vide au moins de candidats (MRV) → accélère fortement le solveur. */
function findMRV(g: SGrid): { i: number; cand: number[] } | null {
  let best: { i: number; cand: number[] } | null = null;
  for (let i = 0; i < 81; i++) {
    if (g[i] !== 0) continue;
    const cand = candidates(g, i);
    if (cand.length === 0) return { i, cand };
    if (!best || cand.length < best.cand.length) { best = { i, cand }; if (cand.length === 1) break; }
  }
  return best;
}

/** Compte les solutions (jusqu'à `limit`) — sert à garantir l'unicité. */
export function countSolutions(grid: SGrid, limit = 2): number {
  const g = [...grid];
  let count = 0;
  const rec = (): boolean => {
    const spot = findMRV(g);
    if (!spot) { count++; return count >= limit; }
    if (spot.cand.length === 0) return false;
    for (const v of spot.cand) { g[spot.i] = v; if (rec()) { g[spot.i] = 0; return true; } g[spot.i] = 0; }
    return false;
  };
  rec();
  return count;
}

function shuffle<T>(a: T[], rnd: () => number): T[] {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; }
  return r;
}

/** Grille pleine valide et aléatoire. */
function fillSolved(rnd: () => number): SGrid {
  const g: SGrid = Array(81).fill(0);
  const rec = (): boolean => {
    const spot = findMRV(g);
    if (!spot) return true;
    if (spot.cand.length === 0) return false;
    for (const v of shuffle(spot.cand, rnd)) { g[spot.i] = v; if (rec()) return true; g[spot.i] = 0; }
    return false;
  };
  rec();
  return g;
}

const GIVENS: Record<SDiff, number> = { facile: 40, moyen: 32, difficile: 27 };

/** Génère un puzzle (indices) + sa solution, à solution unique garantie. */
export function generate(diff: SDiff, rnd: () => number = Math.random): { puzzle: SGrid; solution: SGrid } {
  const solution = fillSolved(rnd);
  const target = GIVENS[diff] ?? 32;
  const puzzle = [...solution];
  const order = shuffle(Array.from({ length: 81 }, (_, i) => i), rnd);
  let filled = 81;
  for (const i of order) {
    if (filled <= target) break;
    const backup = puzzle[i];
    puzzle[i] = 0;
    if (countSolutions(puzzle, 2) !== 1) puzzle[i] = backup; // retrait ambigu → on annule
    else filled--;
  }
  return { puzzle, solution };
}

/** Ensemble des index en conflit (même valeur sur ligne/colonne/bloc). */
export function conflicts(g: SGrid): Set<number> {
  const bad = new Set<number>();
  for (let i = 0; i < 81; i++) {
    const v = g[i];
    if (!v) continue;
    for (let k = i + 1; k < 81; k++) {
      if (g[k] !== v) continue;
      if (ROW(k) === ROW(i) || COL(k) === COL(i) || BOX(k) === BOX(i)) { bad.add(i); bad.add(k); }
    }
  }
  return bad;
}

/** Grille pleine et sans conflit ? */
export function isSolved(g: SGrid): boolean {
  return g.every(v => v !== 0) && conflicts(g).size === 0;
}

/** Combien de fois chaque chiffre (1-9) est déjà posé (pour le pavé numérique). */
export function digitCounts(g: SGrid): number[] {
  const c = Array(10).fill(0);
  for (const v of g) if (v) c[v]++;
  return c;
}
