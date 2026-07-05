/* ══════════════════════════════════════════════════════════════════════════
   TERRITOIRES (Blokus-like) — Piece catalogue.
   Each piece is a polyomino defined as a list of [row, col] coordinates,
   NORMALISED so that the minimum row and minimum column are both 0.
   A stable numeric `id` is used everywhere (Firebase, hands, AI).
   ══════════════════════════════════════════════════════════════════════════ */

export type Coord = [number, number];

export interface Piece {
  id: number;
  name: string;
  cells: Coord[];
  size: number;
}

function mk(id: number, name: string, cells: Coord[]): Piece {
  return { id, name, cells, size: cells.length };
}

/* A varied set spanning sizes 1–5: the mono, the domino, two trominoes,
   the five tetrominoes (I, O, T, L, S) and five pentominoes (I, L, P, T, X).
   14 pieces total — enough to make the 14×14 board a real fight without
   dragging on a phone. */
export const PIECES: Piece[] = [
  mk(0, "Point", [[0, 0]]),
  mk(1, "Domino", [[0, 0], [0, 1]]),
  mk(2, "Tri-I", [[0, 0], [0, 1], [0, 2]]),
  mk(3, "Tri-L", [[0, 0], [1, 0], [1, 1]]),
  mk(4, "Tétra-I", [[0, 0], [0, 1], [0, 2], [0, 3]]),
  mk(5, "Tétra-O", [[0, 0], [0, 1], [1, 0], [1, 1]]),
  mk(6, "Tétra-T", [[0, 0], [0, 1], [0, 2], [1, 1]]),
  mk(7, "Tétra-L", [[0, 0], [1, 0], [2, 0], [2, 1]]),
  mk(8, "Tétra-S", [[0, 1], [0, 2], [1, 0], [1, 1]]),
  mk(9, "Penta-L", [[0, 0], [1, 0], [2, 0], [3, 0], [3, 1]]),
  mk(10, "Penta-P", [[0, 0], [0, 1], [1, 0], [1, 1], [2, 0]]),
  mk(11, "Penta-T", [[0, 0], [0, 1], [0, 2], [1, 1], [2, 1]]),
  mk(12, "Penta-X", [[0, 1], [1, 0], [1, 1], [1, 2], [2, 1]]),
  mk(13, "Penta-I", [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]]),
];

export const ALL_PIECE_IDS: number[] = PIECES.map(p => p.id);

const PIECE_BY_ID: Record<number, Piece> = PIECES.reduce((acc, p) => {
  acc[p.id] = p;
  return acc;
}, {} as Record<number, Piece>);

export function getPiece(id: number): Piece | undefined {
  return PIECE_BY_ID[id];
}
