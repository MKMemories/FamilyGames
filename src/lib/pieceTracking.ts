import { useRef } from "react";

/** A board piece with a STABLE id that survives across moves, so a piece
 *  layer can animate it sliding from square to square instead of teleporting. */
export interface TrackedPiece {
  id: number;
  kind: string; // e.g. "P"/"k" for chess, "1".."4" for checkers
  r: number;
  c: number;
}

type Cell = string | number;

function isEmpty(v: Cell): boolean {
  return v === "" || v === 0 || v === undefined || v === null;
}

export function boardKey(board: Cell[][]): string {
  return board.map(row => row.join(",")).join("|");
}

/**
 * Reconcile the previous tracked pieces against a new board, reusing ids so
 * that a moved piece keeps its identity (and animates), captured pieces drop
 * out (exit animation), and appeared pieces get fresh ids (enter animation).
 *
 * Matching is per-kind: exact-position matches first (pieces that didn't move),
 * then nearest-remaining by Manhattan distance (the piece that actually moved).
 * This correctly handles normal moves, castling (K and R are distinct kinds),
 * en passant (the captured pawn simply has no match), and multi-square slides.
 * Promotion changes kind, so it reads as pawn-removed + queen-added (pop).
 */
export function reconcile(prev: TrackedPiece[], board: Cell[][], startId: number): { pieces: TrackedPiece[]; nextId: number } {
  const curByKind = new Map<string, { r: number; c: number }[]>();
  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < board[r].length; c++) {
      const v = board[r][c];
      if (isEmpty(v)) continue;
      const kind = String(v);
      const list = curByKind.get(kind) ?? [];
      list.push({ r, c });
      curByKind.set(kind, list);
    }
  }

  const prevByKind = new Map<string, TrackedPiece[]>();
  for (const p of prev) {
    const list = prevByKind.get(p.kind) ?? [];
    list.push(p);
    prevByKind.set(p.kind, list);
  }

  const result: TrackedPiece[] = [];
  let nextId = startId;

  for (const [kind, curs] of curByKind) {
    const avail = (prevByKind.get(kind) ?? []).slice();
    const claimed = new Set<TrackedPiece>();
    const pending: { r: number; c: number }[] = [];

    // exact-position matches first (pieces that stayed put)
    for (const cur of curs) {
      const exact = avail.find(p => !claimed.has(p) && p.r === cur.r && p.c === cur.c);
      if (exact) { claimed.add(exact); result.push({ id: exact.id, kind, r: cur.r, c: cur.c }); }
      else pending.push(cur);
    }
    // nearest-remaining for the rest (the moved piece)
    for (const cur of pending) {
      let best: TrackedPiece | null = null;
      let bestD = Infinity;
      for (const p of avail) {
        if (claimed.has(p)) continue;
        const d = Math.abs(p.r - cur.r) + Math.abs(p.c - cur.c);
        if (d < bestD) { bestD = d; best = p; }
      }
      if (best) { claimed.add(best); result.push({ id: best.id, kind, r: cur.r, c: cur.c }); }
      else result.push({ id: nextId++, kind, r: cur.r, c: cur.c });
    }
  }

  return { pieces: result, nextId };
}

/** Hook: returns the stable-id tracked pieces for the current board. */
export function useTrackedPieces(board: Cell[][]): TrackedPiece[] {
  const ref = useRef<{ key: string; pieces: TrackedPiece[]; nextId: number } | null>(null);
  const key = boardKey(board);
  if (!ref.current) {
    const { pieces, nextId } = reconcile([], board, 0);
    ref.current = { key, pieces, nextId };
  } else if (ref.current.key !== key) {
    const { pieces, nextId } = reconcile(ref.current.pieces, board, ref.current.nextId);
    ref.current = { key, pieces, nextId };
  }
  return ref.current.pieces;
}
