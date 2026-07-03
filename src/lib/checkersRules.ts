/**
 * checkersRules.ts — PURE draughts ("Dames") rules engine.
 *
 * Framework-free & unit-testable: no React, no Firebase, no side effects.
 * All functions are deterministic and NEVER mutate their inputs (the board
 * is always cloned before any write).
 *
 * Board representation (8×8 `number[][]`):
 *   0 = empty
 *   Player 0 : 1 = man, 3 = king   — starts at the BOTTOM, men move UP   (dr = -1)
 *   Player 1 : 2 = man, 4 = king   — starts at the TOP,    men move DOWN (dr = +1)
 *   Kings (3/4) move & jump one step diagonally in ALL four directions
 *   (English-draughts "slow" king — NOT a flying king).
 *
 * Pieces only ever live on dark squares (r + c) % 2 === 1.
 */

export type Cell = [number, number];

const SIZE = 8;

/** True when (r,c) is inside the 8×8 board. */
function inBounds(r: number, c: number): boolean {
  return r >= 0 && r < SIZE && c >= 0 && c < SIZE;
}

/** Deep-clone a board so callers never mutate the source. */
function cloneBoard(board: number[][]): number[][] {
  return board.map(row => row.slice());
}

/** The two piece codes belonging to a player: [man, king]. */
export function playerPieces(playerIdx: number): number[] {
  return playerIdx === 0 ? [1, 3] : [2, 4];
}

/** True when `piece` belongs to `playerIdx`. */
function isOwn(piece: number, playerIdx: number): boolean {
  return playerIdx === 0 ? piece === 1 || piece === 3 : piece === 2 || piece === 4;
}

/** True when `piece` is an enemy of `playerIdx` (non-empty & not owned). */
function isEnemy(piece: number, playerIdx: number): boolean {
  if (piece === 0) return false;
  return !isOwn(piece, playerIdx);
}

/** True when the piece code is a king (3 or 4). */
function isKing(piece: number): boolean {
  return piece === 3 || piece === 4;
}

/** Which player a piece belongs to, or -1 for empty. */
function ownerOf(piece: number): number {
  if (piece === 1 || piece === 3) return 0;
  if (piece === 2 || piece === 4) return 1;
  return -1;
}

/**
 * The vertical directions a given piece may travel in.
 * Men: forward only (player 0 → up/-1, player 1 → down/+1).
 * Kings: both vertical directions.
 */
function pieceRowDirs(piece: number): number[] {
  const owner = ownerOf(piece);
  if (owner < 0) return [];
  const forward = owner === 0 ? -1 : 1;
  return isKing(piece) ? [-1, 1] : [forward];
}

/**
 * Non-capture single steps for the piece at (r,c), respecting colour and
 * man-vs-king directionality. Returns [] if the square holds no piece.
 */
export function simpleMoves(board: number[][], r: number, c: number): Cell[] {
  const piece = board[r][c];
  if (piece === 0) return [];
  const moves: Cell[] = [];
  for (const dr of pieceRowDirs(piece)) {
    for (const dc of [-1, 1]) {
      const nr = r + dr;
      const nc = c + dc;
      if (inBounds(nr, nc) && board[nr][nc] === 0) moves.push([nr, nc]);
    }
  }
  return moves;
}

/**
 * Capture jumps (landing squares) for the piece at (r,c): jump diagonally
 * over an adjacent enemy into the empty square beyond. Respects colour and
 * man-vs-king directionality. Returns [] if the square holds no piece.
 */
export function captureMoves(board: number[][], r: number, c: number): Cell[] {
  const piece = board[r][c];
  if (piece === 0) return [];
  const owner = ownerOf(piece);
  const moves: Cell[] = [];
  for (const dr of pieceRowDirs(piece)) {
    for (const dc of [-1, 1]) {
      const mr = r + dr; // mid (jumped) square
      const mc = c + dc;
      const lr = r + dr * 2; // landing square
      const lc = c + dc * 2;
      if (!inBounds(lr, lc)) continue;
      if (
        isEnemy(board[mr][mc], owner) &&
        board[lr][lc] === 0
      ) {
        moves.push([lr, lc]);
      }
    }
  }
  return moves;
}

/** Does `playerIdx` have ANY capture available anywhere on the board? */
export function hasAnyCapture(board: number[][], playerIdx: number): boolean {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (isOwn(board[r][c], playerIdx) && captureMoves(board, r, c).length > 0) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Legal destinations for the piece at (r,c) for `playerIdx`.
 * When `mustCapture` is true, only capture moves are legal (mandatory capture);
 * otherwise simple moves are returned. Returns [] if the piece is not owned.
 */
export function legalMovesFrom(
  board: number[][],
  r: number,
  c: number,
  playerIdx: number,
  mustCapture: boolean,
): Cell[] {
  if (!isOwn(board[r][c], playerIdx)) return [];
  return mustCapture ? captureMoves(board, r, c) : simpleMoves(board, r, c);
}

/**
 * Does `playerIdx` have ANY legal move (capture or simple)? Used to detect a
 * blocked / lost player at the start of their turn.
 */
export function hasAnyMove(board: number[][], playerIdx: number): boolean {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (!isOwn(board[r][c], playerIdx)) continue;
      if (captureMoves(board, r, c).length > 0) return true;
      if (simpleMoves(board, r, c).length > 0) return true;
    }
  }
  return false;
}

/**
 * Apply a single step or jump for `playerIdx`, moving the piece from `from`
 * to `to`. The move is assumed pre-validated by the caller (it should be one
 * of `legalMovesFrom`). Returns a fresh board plus flags:
 *
 *   captured  — true when an enemy piece was jumped (|Δrow| === 2)
 *   promoted  — true when a man just reached the far row and became a king
 *   canChain  — true when the SAME piece can capture again from `dest`
 *               (only when it captured AND did not just promote — promotion
 *                ends the turn per standard rules)
 *   dest      — the landing square (echo of `to`)
 *
 * Never mutates the input board.
 */
export function applyMove(
  board: number[][],
  from: Cell,
  to: Cell,
  playerIdx: number,
): { board: number[][]; captured: boolean; promoted: boolean; canChain: boolean; dest: Cell } {
  const nb = cloneBoard(board);
  const [fr, fc] = from;
  const [tr, tc] = to;
  const piece = nb[fr][fc];

  // Move the piece.
  nb[fr][fc] = 0;
  nb[tr][tc] = piece;

  // A jump removes the piece on the midpoint square.
  const captured = Math.abs(tr - fr) === 2;
  if (captured) {
    const mr = (fr + tr) / 2;
    const mc = (fc + tc) / 2;
    nb[mr][mc] = 0;
  }

  // Promotion: a man reaching the far row becomes a king (ends the turn).
  let promoted = false;
  if (!isKing(piece)) {
    if (playerIdx === 0 && tr === 0) {
      nb[tr][tc] = 3;
      promoted = true;
    } else if (playerIdx === 1 && tr === SIZE - 1) {
      nb[tr][tc] = 4;
      promoted = true;
    }
  }

  // Chaining is only possible after a capture, when the piece did NOT just
  // promote, and the same piece has a further capture from its new square.
  const canChain =
    captured && !promoted && captureMoves(nb, tr, tc).length > 0;

  return { board: nb, captured, promoted, canChain, dest: [tr, tc] };
}
