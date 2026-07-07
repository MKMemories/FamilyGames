/* ══════════════════════════════════════════════════════════════════════════
   TETRIS — moteur pur (plateau, pièces, rotation + wall-kicks, collision, lignes,
   score, sac de 7). Aucune dépendance : testable et déterministe. Le rendu et la
   boucle de jeu vivent dans le composant Tetris.tsx.
   ══════════════════════════════════════════════════════════════════════════ */

export const COLS = 10;
export const ROWS = 20;

export type Board = number[][];              // ROWS×COLS, 0 = vide, 1-7 = couleur

/* Matrices d'orientation 0 (carrées → rotation par transposition). id = 1..7. */
export const SHAPES: number[][][] = [
  [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]], // I
  [[2, 2], [2, 2]],                                          // O
  [[0, 3, 0], [3, 3, 3], [0, 0, 0]],                         // T
  [[0, 4, 4], [4, 4, 0], [0, 0, 0]],                         // S
  [[5, 5, 0], [0, 5, 5], [0, 0, 0]],                         // Z
  [[6, 0, 0], [6, 6, 6], [0, 0, 0]],                         // J
  [[0, 0, 7], [7, 7, 7], [0, 0, 0]],                         // L
];

/* Couleurs (index = id). Teintes vives, glossy dans le rendu. */
export const COLORS = ["", "#22d3ee", "#fbbf24", "#c084fc", "#4ade80", "#fb7185", "#60a5fa", "#fb923c"];

export interface Piece { id: number; mat: number[][]; r: number; c: number; }

export const emptyBoard = (): Board => Array.from({ length: ROWS }, () => Array(COLS).fill(0));

export function spawn(id: number): Piece {
  const mat = SHAPES[id - 1].map(row => [...row]);
  return { id, mat, r: id === 1 ? -1 : 0, c: Math.floor((COLS - mat[0].length) / 2) };
}

/** Rotation horaire (matrice carrée). */
export function rotateCW(mat: number[][]): number[][] {
  const n = mat.length;
  const out = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) out[j][n - 1 - i] = mat[i][j];
  return out;
}
export function rotateCCW(mat: number[][]): number[][] {
  const n = mat.length;
  const out = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) out[n - 1 - j][i] = mat[i][j];
  return out;
}

/** Collision d'une matrice posée en (r,c) : hors-bord ou case occupée. */
export function collides(board: Board, mat: number[][], r: number, c: number): boolean {
  for (let i = 0; i < mat.length; i++) {
    for (let j = 0; j < mat[i].length; j++) {
      if (!mat[i][j]) continue;
      const br = r + i, bc = c + j;
      if (bc < 0 || bc >= COLS || br >= ROWS) return true;
      if (br >= 0 && board[br][bc]) return true;
    }
  }
  return false;
}

/** Tente une rotation avec wall-kicks (décalages simples mais efficaces). */
export function tryRotate(board: Board, p: Piece, cw: boolean): Piece | null {
  const mat = cw ? rotateCW(p.mat) : rotateCCW(p.mat);
  const kicks = [0, -1, 1, -2, 2];
  for (const dc of kicks) {
    if (!collides(board, mat, p.r, p.c + dc)) return { ...p, mat, c: p.c + dc };
    if (!collides(board, mat, p.r - 1, p.c + dc)) return { ...p, mat, r: p.r - 1, c: p.c + dc }; // floor kick
  }
  return null;
}

/** Fige la pièce dans une COPIE du plateau. */
export function merge(board: Board, p: Piece): Board {
  const b = board.map(row => [...row]);
  for (let i = 0; i < p.mat.length; i++) {
    for (let j = 0; j < p.mat[i].length; j++) {
      if (!p.mat[i][j]) continue;
      const br = p.r + i, bc = p.c + j;
      if (br >= 0 && br < ROWS && bc >= 0 && bc < COLS) b[br][bc] = p.id;
    }
  }
  return b;
}

/** Retire les lignes pleines. Renvoie le nouveau plateau et le nb de lignes. */
export function clearLines(board: Board): { board: Board; cleared: number } {
  const kept = board.filter(row => row.some(v => !v));
  const cleared = ROWS - kept.length;
  while (kept.length < ROWS) kept.unshift(Array(COLS).fill(0));
  return { board: kept, cleared };
}

/** Position d'atterrissage (pièce fantôme). */
export function ghostRow(board: Board, p: Piece): number {
  let r = p.r;
  while (!collides(board, p.mat, r + 1, p.c)) r++;
  return r;
}

/** Score d'un nombre de lignes (barème classique × niveau). */
export function lineScore(cleared: number, level: number): number {
  const base = [0, 100, 300, 500, 800][cleared] || 0;
  return base * level;
}

/** Générateur « sac de 7 » : distribution équilibrée des pièces. */
export function makeBag(rnd: () => number = Math.random) {
  let bag: number[] = [];
  const refill = () => {
    bag = [1, 2, 3, 4, 5, 6, 7];
    for (let i = bag.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [bag[i], bag[j]] = [bag[j], bag[i]]; }
  };
  return {
    next(): number { if (bag.length === 0) refill(); return bag.shift()!; },
  };
}

/** Vitesse de chute (ms par descente) selon le niveau. */
export function dropInterval(level: number): number {
  return Math.max(70, 800 - (level - 1) * 65);
}
