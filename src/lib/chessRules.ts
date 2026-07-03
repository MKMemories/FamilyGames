/**
 * chessRules.ts — Pure, framework-free chess rules engine.
 *
 * Board model: string[][] 8×8. Uppercase = WHITE (K Q R B N P),
 * lowercase = black, "" = empty. Row 0 = top (black back rank),
 * row 7 = bottom (white back rank). White pawns move UP (row--),
 * black pawns move DOWN (row++).
 *
 * All functions are deterministic and side-effect free: inputs are
 * never mutated (boards are cloned before any change).
 */

export type Ctx = {
  /** Castling rights, e.g. "KQkq" (K/Q white, k/q black), "" if none. */
  castle: string;
  /** En-passant target square as "r,c", or null. */
  ep: string | null;
};

/* ── Geometry constants ──────────────────────────────────────── */
const KNIGHT: [number, number][] = [
  [-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1],
];
const KING8: [number, number][] = [
  [-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1],
];
const ORTHO: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const DIAG: [number, number][] = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

/* ── Tiny helpers ────────────────────────────────────────────── */
const inB = (r: number, c: number) => r >= 0 && r < 8 && c >= 0 && c < 8;
const isWhite = (p: string) => p !== "" && p === p.toUpperCase();
const cloneBoard = (b: string[][]) => b.map(row => row.slice());

/** Locate the king ("K" or "k") of the given colour. */
function findKing(board: string[][], white: boolean): [number, number] | null {
  const k = white ? "K" : "k";
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++)
      if (board[r][c] === k) return [r, c];
  return null;
}

/**
 * Is square (r,c) attacked by any piece of colour `byWhite`?
 * Exported so the rules (and tests) can reason about check directly.
 */
export function squareAttackedBy(
  board: string[][],
  r: number,
  c: number,
  byWhite: boolean
): boolean {
  if (!inB(r, c)) return false;

  // Pawn attacks: an attacking pawn sits one row "behind" the square,
  // on either diagonal file. White pawns capture upward → sit at r+1.
  const pRow = r + (byWhite ? 1 : -1);
  const pawnCh = byWhite ? "P" : "p";
  if (inB(pRow, c - 1) && board[pRow][c - 1] === pawnCh) return true;
  if (inB(pRow, c + 1) && board[pRow][c + 1] === pawnCh) return true;

  // Knights
  const nCh = byWhite ? "N" : "n";
  for (const [dr, dc] of KNIGHT)
    if (inB(r + dr, c + dc) && board[r + dr][c + dc] === nCh) return true;

  // Adjacent king
  const kCh = byWhite ? "K" : "k";
  for (const [dr, dc] of KING8)
    if (inB(r + dr, c + dc) && board[r + dr][c + dc] === kCh) return true;

  // Sliding: rook/queen orthogonally, bishop/queen diagonally
  const rCh = byWhite ? "R" : "r";
  const bCh = byWhite ? "B" : "b";
  const qCh = byWhite ? "Q" : "q";
  for (const [dr, dc] of ORTHO) {
    for (let i = 1; i < 8; i++) {
      const nr = r + dr * i, nc = c + dc * i;
      if (!inB(nr, nc)) break;
      const t = board[nr][nc];
      if (t === "") continue;
      if (t === rCh || t === qCh) return true;
      break;
    }
  }
  for (const [dr, dc] of DIAG) {
    for (let i = 1; i < 8; i++) {
      const nr = r + dr * i, nc = c + dc * i;
      if (!inB(nr, nc)) break;
      const t = board[nr][nc];
      if (t === "") continue;
      if (t === bCh || t === qCh) return true;
      break;
    }
  }
  return false;
}

/** King square of `white` side if it is currently attacked, else null. */
export function kingInCheck(board: string[][], white: boolean): [number, number] | null {
  const k = findKing(board, white);
  if (!k) return null;
  return squareAttackedBy(board, k[0], k[1], !white) ? k : null;
}

/**
 * Produce the board resulting from a move, handling the special cases:
 * castling (also moves the rook), en passant (removes the passed pawn),
 * and promotion. Used both by applyMove and by the legality filter.
 * Does NOT validate legality — caller must have vetted the move.
 */
function makeBoard(
  board: string[][],
  from: [number, number],
  to: [number, number],
  promoteTo: string
): string[][] {
  const [fr, fc] = from, [tr, tc] = to;
  const nb = cloneBoard(board);
  const piece = nb[fr][fc];
  const lower = piece.toLowerCase();
  const white = isWhite(piece);

  nb[fr][fc] = "";

  // En passant: pawn moves diagonally onto an empty square → the captured
  // enemy pawn sits on the mover's origin row, in the destination file.
  if (lower === "p" && fc !== tc && board[tr][tc] === "") {
    nb[fr][tc] = "";
  }

  // Promotion (default queen)
  let placed = piece;
  if (lower === "p" && (tr === 0 || tr === 7)) {
    const pp = (promoteTo || "Q").toUpperCase();
    placed = white ? pp : pp.toLowerCase();
  }
  nb[tr][tc] = placed;

  // Castling: king moved two files → shift the matching rook.
  if (lower === "k" && Math.abs(tc - fc) === 2) {
    if (tc === 6) { nb[fr][5] = nb[fr][7]; nb[fr][7] = ""; }   // kingside
    else if (tc === 2) { nb[fr][3] = nb[fr][0]; nb[fr][0] = ""; } // queenside
  }
  return nb;
}

/** Pseudo-legal destinations (ignoring self-check), incl. castling & en passant. */
function pseudoMoves(board: string[][], r: number, c: number, ctx: Ctx): [number, number][] {
  const piece = board[r][c];
  if (piece === "") return [];
  const white = isWhite(piece);
  const lower = piece.toLowerCase();
  const moves: [number, number][] = [];

  const empty = (rr: number, cc: number) => inB(rr, cc) && board[rr][cc] === "";
  const enemy = (rr: number, cc: number) => {
    if (!inB(rr, cc)) return false;
    const t = board[rr][cc];
    return t !== "" && isWhite(t) !== white;
  };
  const canLand = (rr: number, cc: number) => inB(rr, cc) && (board[rr][cc] === "" || enemy(rr, cc));
  const slide = (dr: number, dc: number) => {
    for (let i = 1; i < 8; i++) {
      const nr = r + dr * i, nc = c + dc * i;
      if (!inB(nr, nc)) break;
      if (board[nr][nc] === "") moves.push([nr, nc]);
      else { if (enemy(nr, nc)) moves.push([nr, nc]); break; }
    }
  };

  if (lower === "p") {
    const dir = white ? -1 : 1;
    const startRow = white ? 6 : 1;
    // Forward one / two
    if (empty(r + dir, c)) {
      moves.push([r + dir, c]);
      if (r === startRow && empty(r + 2 * dir, c)) moves.push([r + 2 * dir, c]);
    }
    // Captures + en passant
    for (const dc of [-1, 1]) {
      const nr = r + dir, nc = c + dc;
      if (!inB(nr, nc)) continue;
      if (enemy(nr, nc)) { moves.push([nr, nc]); continue; }
      if (ctx.ep) {
        const [er, ec] = ctx.ep.split(",").map(Number);
        if (nr === er && nc === ec) moves.push([nr, nc]);
      }
    }
  } else if (lower === "r") {
    ORTHO.forEach(([dr, dc]) => slide(dr, dc));
  } else if (lower === "b") {
    DIAG.forEach(([dr, dc]) => slide(dr, dc));
  } else if (lower === "q") {
    ORTHO.forEach(([dr, dc]) => slide(dr, dc));
    DIAG.forEach(([dr, dc]) => slide(dr, dc));
  } else if (lower === "n") {
    KNIGHT.forEach(([dr, dc]) => { if (canLand(r + dr, c + dc)) moves.push([r + dr, c + dc]); });
  } else if (lower === "k") {
    KING8.forEach(([dr, dc]) => { if (canLand(r + dr, c + dc)) moves.push([r + dr, c + dc]); });

    // Castling — king on its home square, not currently in check.
    const homeRow = white ? 7 : 0;
    if (r === homeRow && c === 4 && !squareAttackedBy(board, homeRow, 4, !white)) {
      const rights = ctx.castle || "";
      const kSide = white ? "K" : "k";
      const qSide = white ? "Q" : "q";
      // Kingside: f/g empty, rook on h, king not passing through attack.
      if (
        rights.includes(kSide) &&
        board[homeRow][7].toLowerCase() === "r" &&
        empty(homeRow, 5) && empty(homeRow, 6) &&
        !squareAttackedBy(board, homeRow, 5, !white) &&
        !squareAttackedBy(board, homeRow, 6, !white)
      ) moves.push([homeRow, 6]);
      // Queenside: b/c/d empty, rook on a, king not passing through attack.
      if (
        rights.includes(qSide) &&
        board[homeRow][0].toLowerCase() === "r" &&
        empty(homeRow, 1) && empty(homeRow, 2) && empty(homeRow, 3) &&
        !squareAttackedBy(board, homeRow, 2, !white) &&
        !squareAttackedBy(board, homeRow, 3, !white)
      ) moves.push([homeRow, 2]);
    }
  }
  return moves;
}

/**
 * All LEGAL destination squares for the piece at (r,c), i.e. pseudo-legal
 * moves minus any that would leave the mover's own king in check.
 */
export function legalMoves(board: string[][], r: number, c: number, ctx: Ctx): [number, number][] {
  const piece = board?.[r]?.[c];
  if (!piece) return [];
  const white = isWhite(piece);
  const out: [number, number][] = [];
  for (const [tr, tc] of pseudoMoves(board, r, c, ctx)) {
    const nb = makeBoard(board, [r, c], [tr, tc], "Q");
    if (!kingInCheck(nb, white)) out.push([tr, tc]);
  }
  return out;
}

/**
 * Apply a fully-legal move. Handles normal moves, captures, castling,
 * en passant and promotion. Returns the new board with refreshed castling
 * rights and the new en-passant target ("r,c" or null). Input is not mutated.
 */
export function applyMove(
  board: string[][],
  from: [number, number],
  to: [number, number],
  ctx: Ctx,
  promoteTo?: string
): { board: string[][]; castle: string; ep: string | null } {
  const [fr, fc] = from, [tr, tc] = to;
  const piece = board[fr][fc];
  const lower = piece.toLowerCase();
  const white = isWhite(piece);

  const nb = makeBoard(board, from, to, promoteTo || "Q");

  // ── Refresh castling rights ──
  let castle = ctx.castle || "";
  const drop = (ch: string) => { castle = castle.replace(ch, ""); };
  if (lower === "k") {
    if (white) { drop("K"); drop("Q"); } else { drop("k"); drop("q"); }
  }
  if (lower === "r") {
    if (white && fr === 7 && fc === 0) drop("Q");
    if (white && fr === 7 && fc === 7) drop("K");
    if (!white && fr === 0 && fc === 0) drop("q");
    if (!white && fr === 0 && fc === 7) drop("k");
  }
  // Rook captured on its home square removes that right.
  if (tr === 7 && tc === 0) drop("Q");
  if (tr === 7 && tc === 7) drop("K");
  if (tr === 0 && tc === 0) drop("q");
  if (tr === 0 && tc === 7) drop("k");

  // ── New en-passant target (only on a pawn double-step) ──
  let ep: string | null = null;
  if (lower === "p" && Math.abs(tr - fr) === 2) {
    ep = `${(tr + fr) / 2},${fc}`;
  }

  return { board: nb, castle, ep };
}

/** True if `white` side has at least one legal move. */
export function hasLegalMove(board: string[][], white: boolean, ctx: Ctx): boolean {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p === "" || isWhite(p) !== white) continue;
      if (legalMoves(board, r, c, ctx).length > 0) return true;
    }
  }
  return false;
}

/** Game status for the side to move, plus its king square if in check. */
export function statusFor(
  board: string[][],
  white: boolean,
  ctx: Ctx
): { status: "playing" | "check" | "checkmate" | "stalemate"; king: [number, number] | null } {
  const king = kingInCheck(board, white);
  const canMove = hasLegalMove(board, white, ctx);
  if (canMove) return { status: king ? "check" : "playing", king };
  return { status: king ? "checkmate" : "stalemate", king };
}

/** Would this move promote a pawn (reach the last rank)? */
export function isPromotion(board: string[][], from: [number, number], to: [number, number]): boolean {
  const p = board?.[from[0]]?.[from[1]];
  if (!p || p.toLowerCase() !== "p") return false;
  return to[0] === 0 || to[0] === 7;
}
