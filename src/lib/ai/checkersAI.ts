/**
 * checkersAI.ts — PURE computer opponent for the "Dames" (draughts) game.
 *
 * Framework-free & unit-testable: no React, no Firebase, no side effects.
 * It NEVER mutates its inputs (every board is produced fresh by the rules
 * engine's `applyMove`) and it never reads the clock. `Math.random` is used
 * ONLY for the "facile" difficulty (a random-but-legal move).
 *
 * The public entry point is {@link bestCheckersTurn}, which returns a FULL
 * turn as a path of squares `[from, step1, step2, ...]`:
 *   - a simple move  => `[from, to]`
 *   - a multi-jump   => `[from, mid1, mid2, ...]` (each hop lands on the next).
 *
 * Board encoding (matches checkersRules.ts):
 *   0 = empty
 *   Player 0 : 1 = man, 3 = king — starts BOTTOM, men move UP   (promote row 0)
 *   Player 1 : 2 = man, 4 = king — starts TOP,    men move DOWN (promote row 7)
 */

import {
  applyMove,
  captureMoves,
  hasAnyCapture,
  hasAnyMove,
  simpleMoves,
} from "../checkersRules";

export type Difficulty = "facile" | "moyen" | "difficile";

type Cell = [number, number];
type Turn = Cell[]; // [from, step1, step2, ...]

const SIZE = 8;

// Search depth (in plies / full turns) per difficulty for the minimax path.
const DEPTH: Record<Difficulty, number> = {
  facile: 0, // unused (random)
  moyen: 2,
  difficile: 4,
};

// Evaluation weights.
const MAN_VALUE = 1.0;
const KING_VALUE = 1.7;
const ADVANCE_WEIGHT = 0.06; // per row a man has advanced toward promotion
const BACKROW_BONUS = 0.18; // per man still guarding the home back row
const CENTER_BONUS = 0.04; // per piece on the 4 central columns
const WIN_SCORE = 1000; // opponent wiped out / stalemated

/* ------------------------------------------------------------------ helpers */

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

function other(playerIdx: number): number {
  return playerIdx === 0 ? 1 : 0;
}

/* ------------------------------------------------------- turn generation */

/**
 * Recursively expand every complete capture sequence for the piece currently
 * at `from`. Each returned path starts with `from`. Promotion ends the turn
 * (the engine reports `canChain === false` after a promoting jump), so those
 * sequences terminate correctly.
 */
function expandCaptures(board: number[][], from: Cell, playerIdx: number): Turn[] {
  const [r, c] = from;
  const landings = captureMoves(board, r, c);
  if (landings.length === 0) return [];

  const paths: Turn[] = [];
  for (const to of landings) {
    const res = applyMove(board, from, to, playerIdx);
    if (res.canChain) {
      // Same piece must keep jumping from its new square.
      const tails = expandCaptures(res.board, res.dest, playerIdx);
      for (const tail of tails) {
        // tail starts with `to` (=res.dest); keep every hop: [from, to, ...rest].
        paths.push([from, ...tail]);
      }
    } else {
      paths.push([from, to]);
    }
  }
  return paths;
}

/**
 * Every LEGAL full turn for `playerIdx` on `board`.
 * Mandatory-capture rule: if any capture exists, ONLY capture sequences are
 * returned (expanded to their full multi-jump length); otherwise all simple
 * one-step moves are returned.
 */
export function generateTurns(board: number[][], playerIdx: number): Turn[] {
  const mustCapture = hasAnyCapture(board, playerIdx);
  const turns: Turn[] = [];

  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (!isOwn(board[r][c], playerIdx)) continue;
      if (mustCapture) {
        turns.push(...expandCaptures(board, [r, c], playerIdx));
      } else {
        for (const to of simpleMoves(board, r, c)) {
          turns.push([[r, c], to]);
        }
      }
    }
  }
  return turns;
}

/** Fold `applyMove` over consecutive pairs to get the board after a full turn. */
export function applyTurn(board: number[][], turn: Turn, playerIdx: number): number[][] {
  let b = board;
  for (let i = 0; i < turn.length - 1; i++) {
    b = applyMove(b, turn[i], turn[i + 1], playerIdx).board;
  }
  return b;
}

/* --------------------------------------------------------------- evaluation */

/**
 * Static evaluation of `board` from `aiIdx`'s perspective (higher = better for
 * the AI). Combines material (men vs kings), man advancement toward promotion,
 * back-row defense, mild central control, and a large terminal bonus/penalty
 * when a side has been wiped out or stalemated.
 */
export function evaluateBoard(board: number[][], aiIdx: number): number {
  const oppIdx = other(aiIdx);
  let score = 0;
  let aiCount = 0;
  let oppCount = 0;

  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const piece = board[r][c];
      if (piece === 0) continue;
      const owner = ownerOf(piece);
      const king = isKing(piece);

      let v = king ? KING_VALUE : MAN_VALUE;

      if (!king) {
        // Men score for advancement toward their promotion row, and for
        // guarding their own back row (which blocks enemy promotion).
        if (owner === 0) {
          v += (SIZE - 1 - r) * ADVANCE_WEIGHT; // player 0 promotes at row 0
          if (r === SIZE - 1) v += BACKROW_BONUS;
        } else {
          v += r * ADVANCE_WEIGHT; // player 1 promotes at row 7
          if (r === 0) v += BACKROW_BONUS;
        }
      }
      if (c >= 2 && c <= 5) v += CENTER_BONUS;

      if (owner === aiIdx) {
        score += v;
        aiCount++;
      } else {
        score -= v;
        oppCount++;
      }
    }
  }

  if (oppCount === 0) return WIN_SCORE;
  if (aiCount === 0) return -WIN_SCORE;
  return score;
}

/* ------------------------------------------------------------------ minimax */

function minimax(
  board: number[][],
  playerToMove: number,
  aiIdx: number,
  depth: number,
  alpha: number,
  beta: number,
): number {
  if (depth <= 0) return evaluateBoard(board, aiIdx);

  const turns = generateTurns(board, playerToMove);
  if (turns.length === 0) {
    // The side to move is stalemated / wiped out and loses. Deeper wins/losses
    // are slightly discounted so the AI prefers the quickest kill / slowest death.
    return playerToMove === aiIdx ? -WIN_SCORE - depth : WIN_SCORE + depth;
  }

  const maximizing = playerToMove === aiIdx;
  let best = maximizing ? -Infinity : Infinity;

  for (const turn of turns) {
    const nb = applyTurn(board, turn, playerToMove);
    const v = minimax(nb, other(playerToMove), aiIdx, depth - 1, alpha, beta);
    if (maximizing) {
      if (v > best) best = v;
      if (best > alpha) alpha = best;
    } else {
      if (v < best) best = v;
      if (best < beta) beta = best;
    }
    if (beta <= alpha) break; // alpha-beta cutoff
  }
  return best;
}

/** Number of captured enemy pieces in a turn (0 for a simple move). */
function captureCount(turn: Turn): number {
  // Each hop with |Δrow| === 2 is a jump over exactly one enemy.
  let n = 0;
  for (let i = 0; i < turn.length - 1; i++) {
    if (Math.abs(turn[i + 1][0] - turn[i][0]) === 2) n++;
  }
  return n;
}

/* ------------------------------------------------------------------- public */

/**
 * Choose the AI's full turn for `board`.
 *   facile    — a random legal full turn (still respects forced capture).
 *   moyen     — greedy 2-ply minimax (best resulting board vs a 1-ply reply).
 *   difficile — alpha-beta minimax to ~4 plies over full turns.
 * Returns the path `[from, step1, ...]`, or `null` if the AI has no move.
 */
export function bestCheckersTurn(
  board: number[][],
  aiPlayerIdx: number,
  difficulty: Difficulty,
): Cell[] | null {
  const turns = generateTurns(board, aiPlayerIdx);
  if (turns.length === 0) return null;
  if (turns.length === 1) return turns[0];

  if (difficulty === "facile") {
    return turns[Math.floor(Math.random() * turns.length)];
  }

  const depth = DEPTH[difficulty] ?? DEPTH.moyen;
  let bestTurn = turns[0];
  let bestScore = -Infinity;
  let bestCaps = -1;

  for (const turn of turns) {
    const nb = applyTurn(board, turn, aiPlayerIdx);
    // Instant win: opponent has no reply at all.
    const terminal = !hasAnyMove(nb, other(aiPlayerIdx));
    const score = terminal
      ? WIN_SCORE + depth
      : minimax(nb, other(aiPlayerIdx), aiPlayerIdx, depth - 1, -Infinity, Infinity);
    const caps = captureCount(turn);

    // Deterministic: strictly-better score wins; ties break toward capturing
    // more pieces (keeps the search from leaving enemy men on the board).
    if (score > bestScore || (score === bestScore && caps > bestCaps)) {
      bestScore = score;
      bestCaps = caps;
      bestTurn = turn;
    }
  }
  return bestTurn;
}
