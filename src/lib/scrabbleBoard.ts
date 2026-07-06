import { LETTER_VALS } from "./gameData";
import { normalizeWord } from "./frenchDict";

/* ══════════════════════════════════════════════════════════════════════════
   MOTEUR DU GRAND SCRABBLE (plateau officiel 15×15)
   - cases bonus officielles, distribution française (102 tuiles, 2 blancs)
   - validation d'un coup : alignement, contiguïté, connexion, mots croisés
   - score : multiplicateurs lettre/mot sur les NOUVELLES tuiles + bonus 50 (scrabble)
   Le tout est PUR (aucun accès réseau/Firebase) → testable unitairement.
   ══════════════════════════════════════════════════════════════════════════ */

export const BOARD_SIZE = 15;
export const CENTER = 7;
export const BINGO_BONUS = 50;
export const BLANK = "?"; // tuile blanche (joker)

/* Cases bonus : '.' normal, '#' lettre double, '@' lettre triple,
   '2' mot double, '3' mot triple, '*' centre (mot double). */
export const BONUS: string[] = [
  "3..#...3...#..3",
  ".2...@...@...2.",
  "..2...#.#...2..",
  "#..2...#...2..#",
  "....2.....2....",
  ".@...@...@...@.",
  "..#...#.#...#..",
  "3..#...*...#..3",
  "..#...#.#...#..",
  ".@...@...@...@.",
  "....2.....2....",
  "#..2...#...2..#",
  "..2...#.#...2..",
  ".2...@...@...2.",
  "3..#...3...#..3",
];
export function bonusAt(r: number, c: number): string {
  return BONUS[r]?.[c] ?? ".";
}
export const BONUS_LABEL: Record<string, string> = { "#": "LD", "@": "LT", "2": "MD", "3": "MT", "*": "★" };

/* Distribution française officielle (102 tuiles avec 2 blancs). */
export const FR_DIST: Record<string, number> = {
  A: 9, B: 2, C: 2, D: 3, E: 15, F: 2, G: 2, H: 2, I: 8, J: 1, K: 1, L: 5, M: 3,
  N: 6, O: 6, P: 2, Q: 1, R: 6, S: 6, T: 6, U: 6, V: 2, W: 1, X: 1, Y: 1, Z: 1, [BLANK]: 2,
};

export function tileValue(letter: string, blank?: boolean): number {
  if (blank || letter === BLANK) return 0;
  return LETTER_VALS[letter] || 0;
}

/** Sac mélangé selon la distribution française. `rnd` = générateur [0,1). */
export function buildScrabbleBag(rnd: () => number): string[] {
  const bag: string[] = [];
  Object.entries(FR_DIST).forEach(([l, n]) => { for (let i = 0; i < n; i++) bag.push(l); });
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  return bag;
}

export interface BCell { l: string; blank?: boolean; }
export type Board = (BCell | null)[][];
export interface Placement { r: number; c: number; l: string; blank?: boolean; }
export interface WordScore { word: string; score: number; cells: [number, number][]; }
export interface MoveResult {
  ok: boolean;
  reason?: string;
  words: WordScore[];
  total: number;    // score total (mots + bonus scrabble)
}

export function emptyBoard(): Board {
  return Array.from({ length: BOARD_SIZE }, () => Array<BCell | null>(BOARD_SIZE).fill(null));
}

/* Applique des placements sur une COPIE du plateau. */
export function withPlacements(board: Board, placements: Placement[]): Board {
  const nb = board.map(row => row.slice());
  for (const p of placements) nb[p.r][p.c] = { l: p.l, blank: p.blank };
  return nb;
}

const inb = (r: number, c: number) => r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE;

/* Construit le mot le long d'une direction (dr,dc) passant par (r,c), en
   remontant jusqu'au début. Renvoie les cellules ordonnées. */
function wordCells(board: Board, r: number, c: number, dr: number, dc: number): [number, number][] {
  let sr = r, sc = c;
  while (inb(sr - dr, sc - dc) && board[sr - dr][sc - dc]) { sr -= dr; sc -= dc; }
  const cells: [number, number][] = [];
  let cr = sr, cc = sc;
  while (inb(cr, cc) && board[cr][cc]) { cells.push([cr, cc]); cr += dr; cc += dc; }
  return cells;
}

/* Score d'un mot donné par ses cellules, sachant quelles cellules sont NEUVES. */
function scoreWord(board: Board, cells: [number, number][], isNew: (r: number, c: number) => boolean): WordScore {
  let sum = 0, wordMult = 1, letters = "";
  for (const [r, c] of cells) {
    const cell = board[r][c]!;
    letters += cell.l;
    let v = tileValue(cell.l, cell.blank);
    if (isNew(r, c)) {
      const b = bonusAt(r, c);
      if (b === "#") v *= 2;
      else if (b === "@") v *= 3;
      else if (b === "2" || b === "*") wordMult *= 2;
      else if (b === "3") wordMult *= 3;
    }
    sum += v;
  }
  return { word: letters, score: sum * wordMult, cells };
}

/** Valide ET score un coup. `dict` = ensemble de mots normalisés (MAJ sans accents).
 *  `boardBefore` = plateau AVANT ce coup. */
export function validateMove(boardBefore: Board, placements: Placement[], dict: Set<string> | null): MoveResult {
  const fail = (reason: string): MoveResult => ({ ok: false, reason, words: [], total: 0 });
  if (placements.length === 0) return fail("Aucune tuile posée");

  // 1. Cellules vides + pas de doublon
  const seen = new Set<string>();
  for (const p of placements) {
    if (!inb(p.r, p.c)) return fail("Hors du plateau");
    if (boardBefore[p.r][p.c]) return fail("Case déjà occupée");
    const k = `${p.r},${p.c}`;
    if (seen.has(k)) return fail("Deux tuiles sur la même case");
    seen.add(k);
  }

  // 2. Alignement (même ligne OU même colonne)
  const rows = new Set(placements.map(p => p.r));
  const cols = new Set(placements.map(p => p.c));
  const horizontal = rows.size === 1;
  const vertical = cols.size === 1;
  if (!horizontal && !vertical) return fail("Les tuiles doivent être alignées");

  const board = withPlacements(boardBefore, placements);
  const isNew = (r: number, c: number) => placements.some(p => p.r === r && p.c === c);

  // 3. Contiguïté le long de l'axe principal (pas de trou)
  const primaryDir: [number, number] = horizontal && placements.length > 1 ? [0, 1]
    : vertical && placements.length > 1 ? [1, 0]
    : horizontal ? [0, 1] : [1, 0];
  {
    const line = horizontal ? placements.map(p => p.c) : placements.map(p => p.r);
    const fixed = horizontal ? placements[0].r : placements[0].c;
    const lo = Math.min(...line), hi = Math.max(...line);
    for (let i = lo; i <= hi; i++) {
      const r = horizontal ? fixed : i;
      const c = horizontal ? i : fixed;
      if (!board[r][c]) return fail("Les tuiles doivent être contiguës");
    }
  }

  // 4. Connexion : 1er coup passe par le centre ; sinon touche l'existant.
  const boardWasEmpty = boardBefore.every(row => row.every(cell => !cell));
  if (boardWasEmpty) {
    if (!placements.some(p => p.r === CENTER && p.c === CENTER)) return fail("Le premier mot doit passer par le centre ★");
  } else {
    const touches = placements.some(p =>
      [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dr, dc]) =>
        inb(p.r + dr, p.c + dc) && boardBefore[p.r + dr][p.c + dc]));
    if (!touches) return fail("Le mot doit toucher une tuile déjà posée");
  }

  // 5. Mots formés : mot principal + croisés
  const words: WordScore[] = [];
  const key = (cells: [number, number][]) => cells.map(([r, c]) => `${r},${c}`).join("|");
  const added = new Set<string>();
  const pushWord = (cells: [number, number][]) => {
    if (cells.length < 2) return true; // une lettre seule n'est pas un mot
    const k = key(cells);
    if (added.has(k)) return true;
    added.add(k);
    const ws = scoreWord(board, cells, isNew);
    if (dict && dict.size > 0 && !dict.has(normalizeWord(ws.word))) return false;
    words.push(ws);
    return true;
  };

  // Mot principal (le long de l'axe), à partir d'une tuile posée.
  const mainCells = wordCells(board, placements[0].r, placements[0].c, primaryDir[0], primaryDir[1]);
  if (!pushWord(mainCells)) return fail(`« ${scoreWord(board, mainCells, isNew).word} » n'est pas dans le dictionnaire`);

  // Mots croisés (perpendiculaires) pour chaque tuile posée.
  const crossDir: [number, number] = primaryDir[0] === 0 ? [1, 0] : [0, 1];
  for (const p of placements) {
    const cc = wordCells(board, p.r, p.c, crossDir[0], crossDir[1]);
    if (!pushWord(cc)) return fail(`« ${scoreWord(board, cc, isNew).word} » n'est pas dans le dictionnaire`);
  }

  if (words.length === 0) return fail("Aucun mot valide formé");

  let total = words.reduce((s, w) => s + w.score, 0);
  if (placements.length === 7) total += BINGO_BONUS; // Scrabble !
  return { ok: true, words, total };
}

/* Ordonne les tuiles restantes pour un affichage (pénalité de fin de partie). */
export function rackValue(rack: string[]): number {
  return rack.reduce((s, l) => s + (l === BLANK ? 0 : LETTER_VALS[l] || 0), 0);
}
