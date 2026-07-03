/**
 * checkersRules.ts — PURE international/French draughts ("Dames") rules engine
 * on an 8×8 board. Framework-free, deterministic, never mutates inputs.
 *
 * Strict rules implemented:
 *   • Men move 1 square diagonally FORWARD (non-capture).
 *   • Men CAPTURE in all 4 diagonal directions (forward AND backward),
 *     jumping an adjacent enemy onto the empty square immediately beyond.
 *   • Kings ("dames") are FLYING: they slide any number of empty squares
 *     diagonally, and capture a single enemy at any distance along a diagonal
 *     (only empties in between), landing on any empty square beyond it.
 *   • Capture is MANDATORY and you must play the MAXIMUM capture (rafle
 *     majoritaire): among all capture sequences, only the longest are legal.
 *   • Multi-jump chains: keep capturing with the same piece until it can't.
 *     A jumped piece stays on the board (as a blocker) until the whole
 *     sequence ends, and may not be jumped twice.
 *   • Promotion: a man that ENDS its move on the far row becomes a king
 *     (passing over the far row mid-capture does not promote).
 *
 * Board (number[][], 8×8): 0 empty; player 0 = 1 man / 3 king (bottom, men go
 * up); player 1 = 2 man / 4 king (top, men go down). Pieces live on dark
 * squares ((r+c)%2===1).
 */

export type Cell = [number, number];
export interface CaptureStep { to: Cell; over: Cell; }
export interface Sequence { from: Cell; steps: CaptureStep[]; }
export type Move =
  | { type: "quiet"; from: Cell; to: Cell }
  | { type: "capture"; seq: Sequence };

const SIZE = 8;
const DIRS: Cell[] = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

function inBounds(r: number, c: number): boolean {
  return r >= 0 && r < SIZE && c >= 0 && c < SIZE;
}
function cloneBoard(board: number[][]): number[][] {
  return board.map(row => row.slice());
}
export function playerPieces(playerIdx: number): number[] {
  return playerIdx === 0 ? [1, 3] : [2, 4];
}
function isKing(piece: number): boolean {
  return piece === 3 || piece === 4;
}
function ownerOf(piece: number): number {
  if (piece === 1 || piece === 3) return 0;
  if (piece === 2 || piece === 4) return 1;
  return -1;
}
function isOwn(piece: number, playerIdx: number): boolean {
  return ownerOf(piece) === playerIdx;
}
function isEnemy(piece: number, playerIdx: number): boolean {
  const o = ownerOf(piece);
  return o !== -1 && o !== playerIdx;
}
const key = (r: number, c: number) => r * SIZE + c;

/**
 * Immediate single jumps for `piece` at (r,c) on `work` (the board with the
 * moving piece already lifted off). Captured squares (still physically on the
 * board) are passed in `captured` and act as blockers that cannot be re-jumped.
 */
function immediateJumps(work: number[][], r: number, c: number, piece: number, captured: Set<number>): CaptureStep[] {
  const owner = ownerOf(piece);
  const out: CaptureStep[] = [];
  for (const [dr, dc] of DIRS) {
    if (!isKing(piece)) {
      const mr = r + dr, mc = c + dc, lr = r + 2 * dr, lc = c + 2 * dc;
      if (!inBounds(lr, lc)) continue;
      if (isEnemy(work[mr][mc], owner) && !captured.has(key(mr, mc)) && work[lr][lc] === 0) {
        out.push({ to: [lr, lc], over: [mr, mc] });
      }
    } else {
      // Flying king: scan to the first blocking square along the diagonal.
      let k = 1;
      let overR = -1, overC = -1;
      while (true) {
        const sr = r + k * dr, sc = c + k * dc;
        if (!inBounds(sr, sc)) break;
        const v = work[sr][sc];
        if (v === 0) { k++; continue; }
        if (isOwn(v, owner) || captured.has(key(sr, sc))) break; // own piece / already-jumped blocks
        // enemy to jump — landing squares are the empties beyond it
        overR = sr; overC = sc;
        let j = k + 1;
        while (true) {
          const lr = r + j * dr, lc = c + j * dc;
          if (!inBounds(lr, lc) || work[lr][lc] !== 0) break;
          out.push({ to: [lr, lc], over: [overR, overC] });
          j++;
        }
        break;
      }
    }
  }
  return out;
}

/** All complete capture paths for the (lifted) piece starting at (r,c). */
function buildPaths(work: number[][], r: number, c: number, piece: number, captured: Set<number>): CaptureStep[][] {
  const jumps = immediateJumps(work, r, c, piece, captured);
  if (jumps.length === 0) return [[]];
  const paths: CaptureStep[][] = [];
  for (const step of jumps) {
    const ok = key(step.over[0], step.over[1]);
    captured.add(ok);
    const subs = buildPaths(work, step.to[0], step.to[1], piece, captured);
    for (const sub of subs) paths.push([step, ...sub]);
    captured.delete(ok);
  }
  return paths;
}

/** Every capture sequence for a player (before applying the maximum rule). */
function allCaptureSequences(board: number[][], playerIdx: number): Sequence[] {
  const seqs: Sequence[] = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (!isOwn(board[r][c], playerIdx)) continue;
      const piece = board[r][c];
      const work = cloneBoard(board);
      work[r][c] = 0; // lift the moving piece
      const paths = buildPaths(work, r, c, piece, new Set());
      for (const path of paths) {
        if (path.length > 0) seqs.push({ from: [r, c], steps: path });
      }
    }
  }
  return seqs;
}

/** Maximal capture sequences (mandatory + maximum-capture rule). */
export function maximalCaptures(board: number[][], playerIdx: number): Sequence[] {
  const all = allCaptureSequences(board, playerIdx);
  let max = 0;
  for (const s of all) if (s.steps.length > max) max = s.steps.length;
  if (max === 0) return [];
  return all.filter(s => s.steps.length === max);
}

/** Non-capture destinations: man = 1 forward step; king = flying slide. */
export function quietMoves(board: number[][], r: number, c: number): Cell[] {
  const piece = board[r][c];
  if (piece === 0) return [];
  const owner = ownerOf(piece);
  const king = isKing(piece);
  const dirs: Cell[] = king ? DIRS : (owner === 0 ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]]);
  const out: Cell[] = [];
  for (const [dr, dc] of dirs) {
    if (!king) {
      const nr = r + dr, nc = c + dc;
      if (inBounds(nr, nc) && board[nr][nc] === 0) out.push([nr, nc]);
    } else {
      let k = 1;
      while (true) {
        const nr = r + k * dr, nc = c + k * dc;
        if (!inBounds(nr, nc) || board[nr][nc] !== 0) break;
        out.push([nr, nc]);
        k++;
      }
    }
  }
  return out;
}

export function hasAnyCapture(board: number[][], playerIdx: number): boolean {
  return allCaptureSequences(board, playerIdx).length > 0;
}

export function hasAnyMove(board: number[][], playerIdx: number): boolean {
  if (hasAnyCapture(board, playerIdx)) return true;
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++)
      if (isOwn(board[r][c], playerIdx) && quietMoves(board, r, c).length > 0) return true;
  return false;
}

/** All legal moves for the player: the maximal captures if any exist, else quiets. */
export function legalMoves(board: number[][], playerIdx: number): Move[] {
  const caps = maximalCaptures(board, playerIdx);
  if (caps.length) return caps.map(seq => ({ type: "capture", seq } as Move));
  const out: Move[] = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (!isOwn(board[r][c], playerIdx)) continue;
      for (const to of quietMoves(board, r, c)) out.push({ type: "quiet", from: [r, c], to });
    }
  }
  return out;
}

function promoteIfNeeded(board: number[][], r: number, c: number, playerIdx: number): boolean {
  const piece = board[r][c];
  if (isKing(piece) || piece === 0) return false;
  if (playerIdx === 0 && r === 0) { board[r][c] = 3; return true; }
  if (playerIdx === 1 && r === SIZE - 1) { board[r][c] = 4; return true; }
  return false;
}

/** Apply a full move (quiet or a whole capture sequence). Never mutates input. */
export function applyMoveFull(board: number[][], move: Move, playerIdx: number): { board: number[][]; promoted: boolean } {
  const nb = cloneBoard(board);
  if (move.type === "quiet") {
    const [fr, fc] = move.from, [tr, tc] = move.to;
    nb[tr][tc] = nb[fr][fc];
    nb[fr][fc] = 0;
    return { board: nb, promoted: promoteIfNeeded(nb, tr, tc, playerIdx) };
  }
  const { from, steps } = move.seq;
  const [fr, fc] = from;
  const piece = nb[fr][fc];
  nb[fr][fc] = 0;
  for (const s of steps) nb[s.over[0]][s.over[1]] = 0; // remove all captured pieces
  const last = steps[steps.length - 1].to;
  nb[last[0]][last[1]] = piece;
  return { board: nb, promoted: promoteIfNeeded(nb, last[0], last[1], playerIdx) };
}

/** Human-facing helper: capture sequences that begin at (r,c) (already maximal). */
export function capturesFrom(board: number[][], playerIdx: number, r: number, c: number): Sequence[] {
  return maximalCaptures(board, playerIdx).filter(s => s.from[0] === r && s.from[1] === c);
}
