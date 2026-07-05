/* ══════════════════════════════════════════════════════════════════════════
   TERRITOIRES (Blokus-like) — Greedy computer opponent.

   Enumerates every legal placement of every remaining piece, scores each, and
   returns the best (with a little randomness on "facile"). Strategy: play the
   biggest pieces first (more area = more points), open the most new diagonal
   "corners" for future reach, and drift toward the centre early so the AI
   doesn't box itself into its own corner.
   ══════════════════════════════════════════════════════════════════════════ */

import { getPiece } from "./blokusPieces";
import type { Placement } from "./blokusRules";
import { orientations, placementCells, isLegalPlacement } from "./blokusRules";

type Difficulty = "facile" | "moyen" | "difficile";

const DIAG: Array<[number, number]> = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

function scorePlacement(board: number[][], owner: number, cells: Array<[number, number]>, n: number): number {
  let s = cells.length * 100; // area is king

  // New diagonal corners this move exposes → future mobility.
  const placed = new Set(cells.map(c => c[0] + "," + c[1]));
  const corners = new Set<string>();
  for (const [r, c] of cells) {
    for (const [dr, dc] of DIAG) {
      const nr = r + dr, nc = c + dc;
      if (nr < 0 || nr >= n || nc < 0 || nc >= n) continue;
      if (board[nr][nc] !== 0) continue;
      const key = nr + "," + nc;
      if (placed.has(key)) continue;
      corners.add(key);
    }
  }
  s += corners.size * 4;

  // Gentle pull toward the centre (spreads out of the home corner).
  const cen = (n - 1) / 2;
  let dist = 0;
  for (const [r, c] of cells) dist += Math.abs(r - cen) + Math.abs(c - cen);
  s -= dist * 0.2;

  return s;
}

/**
 * Best legal move for the AI (seat `index`), or `null` if it must pass.
 * `remainingIds` = piece ids still in the AI's hand.
 */
export function bestBlokusMove(
  board: number[][],
  index: number,
  remainingIds: number[],
  n: number,
  difficulty: Difficulty = "moyen",
): Placement | null {
  const owner = index + 1;

  const scored: Array<{ p: Placement; s: number }> = [];
  for (const id of remainingIds) {
    const piece = getPiece(id);
    if (!piece) continue;
    for (const o of orientations(piece.cells)) {
      for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
          const abs = placementCells(o, [r, c]);
          if (isLegalPlacement(board, owner, abs, n)) {
            scored.push({ p: { pieceId: id, cells: abs }, s: scorePlacement(board, owner, abs, n) });
          }
        }
      }
    }
  }

  if (scored.length === 0) return null;

  // Easy: play a random legal move (still always covers the corner first).
  if (difficulty === "facile") {
    return scored[Math.floor(Math.random() * scored.length)].p;
  }

  scored.sort((a, b) => b.s - a.s);
  const best = scored[0].s;
  const top = scored.filter(x => x.s === best);
  return top[Math.floor(Math.random() * top.length)].p;
}
