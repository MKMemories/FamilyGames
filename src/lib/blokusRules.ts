/* ══════════════════════════════════════════════════════════════════════════
   TERRITOIRES (Blokus-like) — RULES ENGINE (pure, unit-tested)

   Board: square number[][] of side `n`. 0 = empty, else owner value =
   playerIndex + 1 (so index 0 owns 1, index 1 owns 2, …).

   Fixed start corners by seat index:
     0 = top-left     (0,   0)
     1 = bottom-right (n-1, n-1)
     2 = top-right    (0,   n-1)
     3 = bottom-left  (n-1, 0)

   Legality of placing player P's piece on absolute board cells:
     1. All cells in-bounds and currently empty.
     2. If it's P's FIRST piece → it must cover P's start-corner cell.
     3. Otherwise → it must touch ≥1 existing P-cell DIAGONALLY and must NOT
        be edge-adjacent (orthogonally) to any existing P-cell.
        (Adjacency to OTHER players' cells is unrestricted.)

   Orientations: the 8 symmetries (4 rotations × optional horizontal flip).
   ══════════════════════════════════════════════════════════════════════════ */

import type { Coord, Piece } from "./blokusPieces";
import { getPiece } from "./blokusPieces";

/** Shift a set of cells so its min row and min col are both 0. */
export function normalize(cells: Coord[]): Coord[] {
  let minR = Infinity, minC = Infinity;
  for (const [r, c] of cells) {
    if (r < minR) minR = r;
    if (c < minC) minC = c;
  }
  return cells.map(([r, c]) => [r - minR, c - minC] as Coord);
}

/** Canonical row-major ordering (top-to-bottom, left-to-right). */
export function sortCells(cells: Coord[]): Coord[] {
  return [...cells].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
}

/** Rotate 90° clockwise: (r, c) → (c, -r), then normalise. */
export function rotate(cells: Coord[]): Coord[] {
  return normalize(cells.map(([r, c]) => [c, -r] as Coord));
}

/** Horizontal flip: (r, c) → (r, -c), then normalise. */
export function flip(cells: Coord[]): Coord[] {
  return normalize(cells.map(([r, c]) => [r, -c] as Coord));
}

/** Apply an optional flip then `rot` clockwise quarter-turns; sorted+normalised. */
export function orient(cells: Coord[], rot: number, flipped: boolean): Coord[] {
  let cur = flipped ? flip(cells) : normalize(cells);
  const turns = ((rot % 4) + 4) % 4;
  for (let i = 0; i < turns; i++) cur = rotate(cur);
  return sortCells(normalize(cur));
}

/** Stable string key for a shape (used to dedupe symmetric orientations). */
export function canonical(cells: Coord[]): string {
  return sortCells(normalize(cells)).map(c => c.join(",")).join(";");
}

/** All DISTINCT orientations of a shape (≤ 8), each sorted + normalised. */
export function orientations(cells: Coord[]): Coord[][] {
  const seen = new Set<string>();
  const out: Coord[][] = [];
  for (let f = 0; f < 2; f++) {
    for (let r = 0; r < 4; r++) {
      const o = orient(cells, r, f === 1);
      const key = canonical(o);
      if (!seen.has(key)) {
        seen.add(key);
        out.push(o);
      }
    }
  }
  return out;
}

/** Start-corner cell for a seat index on an n×n board. */
export function startCorner(index: number, n: number): Coord {
  switch (index) {
    case 0: return [0, 0];
    case 1: return [n - 1, n - 1];
    case 2: return [0, n - 1];
    case 3: return [n - 1, 0];
    default: return [0, 0];
  }
}

/** True if `owner` already has at least one cell on the board. */
export function ownerHasCells(board: number[][], owner: number): boolean {
  for (const row of board) for (const v of row) if (v === owner) return true;
  return false;
}

/** Number of cells owned by `owner` (used for scoring). */
export function countOwnerCells(board: number[][], owner: number): number {
  let n = 0;
  for (const row of board) for (const v of row) if (v === owner) n++;
  return n;
}

/**
 * Translate a normalised orientation so its FIRST cell (row-major, i.e.
 * orientCells[0]) lands on `target`. The tapped board cell therefore always
 * maps to that first cell — a stable, intuitive anchor convention.
 */
export function placementCells(orientCells: Coord[], target: Coord): Coord[] {
  const [ar, ac] = orientCells[0];
  const dr = target[0] - ar;
  const dc = target[1] - ac;
  return orientCells.map(([r, c]) => [r + dr, c + dc] as Coord);
}

const ORTHO: Coord[] = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const DIAG: Coord[] = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

/**
 * Is placing `owner`'s piece on absolute `absCells` legal right now?
 * `owner` = playerIndex + 1.
 */
export function isLegalPlacement(
  board: number[][],
  owner: number,
  absCells: Coord[],
  n: number,
): boolean {
  if (absCells.length === 0) return false;

  // 1. In-bounds and empty.
  for (const [r, c] of absCells) {
    if (r < 0 || r >= n || c < 0 || c >= n) return false;
    if (board[r][c] !== 0) return false;
  }

  const first = !ownerHasCells(board, owner);
  if (first) {
    // 2. First piece must cover the player's start corner.
    const [cr, cc] = startCorner(owner - 1, n);
    return absCells.some(([r, c]) => r === cr && c === cc);
  }

  // 3. Must diagonally touch own colour; must NOT orthogonally touch it.
  let diagTouch = false;
  for (const [r, c] of absCells) {
    for (const [dr, dc] of ORTHO) {
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < n && nc >= 0 && nc < n && board[nr][nc] === owner) return false;
    }
    for (const [dr, dc] of DIAG) {
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < n && nc >= 0 && nc < n && board[nr][nc] === owner) diagTouch = true;
    }
  }
  return diagTouch;
}

export interface Placement {
  pieceId: number;
  cells: Coord[];
}

/** Every legal placement of a single piece for `owner`. */
export function legalPlacementsForPiece(
  board: number[][],
  owner: number,
  piece: Piece,
  n: number,
): Placement[] {
  const res: Placement[] = [];
  for (const o of orientations(piece.cells)) {
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        const abs = placementCells(o, [r, c]);
        if (isLegalPlacement(board, owner, abs, n)) res.push({ pieceId: piece.id, cells: abs });
      }
    }
  }
  return res;
}

/** Does `owner` have ANY legal placement using any remaining piece? */
export function hasAnyLegalMove(
  board: number[][],
  owner: number,
  remainingIds: number[],
  n: number,
): boolean {
  for (const id of remainingIds) {
    const piece = getPiece(id);
    if (!piece) continue;
    for (const o of orientations(piece.cells)) {
      for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
          const abs = placementCells(o, [r, c]);
          if (isLegalPlacement(board, owner, abs, n)) return true;
        }
      }
    }
  }
  return false;
}

/** All legal placements across all remaining pieces (used by the AI). */
export function allLegalPlacements(
  board: number[][],
  owner: number,
  remainingIds: number[],
  n: number,
): Placement[] {
  const res: Placement[] = [];
  for (const id of remainingIds) {
    const piece = getPiece(id);
    if (!piece) continue;
    for (const o of orientations(piece.cells)) {
      for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
          const abs = placementCells(o, [r, c]);
          if (isLegalPlacement(board, owner, abs, n)) res.push({ pieceId: id, cells: abs });
        }
      }
    }
  }
  return res;
}

/**
 * Index of the next player who has NOT passed, searching forward from
 * `fromTurn`. Returns `fromTurn` unchanged if everyone has passed.
 */
export function nextActiveTurn(
  fromTurn: number,
  order: string[],
  passed: Record<string, boolean>,
): number {
  const n = order.length;
  if (n === 0) return fromTurn;
  for (let step = 1; step <= n; step++) {
    const idx = (fromTurn + step) % n;
    if (!passed[order[idx]]) return idx;
  }
  return fromTurn;
}

/** Have all seated players passed (game over)? */
export function everyonePassed(order: string[], passed: Record<string, boolean>): boolean {
  return order.length > 0 && order.every(pid => passed[pid]);
}
