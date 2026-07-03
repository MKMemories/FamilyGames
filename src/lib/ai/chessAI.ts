/**
 * chessAI.ts — Pure, framework-free chess AI for the solo-vs-computer mode.
 *
 * Depends ONLY on the rules engine (chessRules). No React, no Firebase, no
 * global state — every function is deterministic given its inputs (the sole
 * exception is the intentional `Math.random()` noise on the "facile" level).
 * Inputs are never mutated: new boards are produced via `applyMove`.
 *
 * Board model (see chessRules): string[][] 8×8, uppercase = WHITE, lowercase =
 * black, "" = empty. Row 0 top, row 7 bottom.
 */

import { legalMoves, applyMove, statusFor } from "../chessRules";

export type Difficulty = "facile" | "moyen" | "difficile";

type Ctx = { castle: string; ep: string | null };
type Move = { from: [number, number]; to: [number, number]; promo?: string };

/* ── Material values (centipawn-ish, but on a 1/3/3/5/9 scale) ──────── */
const VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

const MATE = 100000;

/* ── Piece-square tables (from White's point of view, row 0 = black back
 *    rank / top). Values are small nudges vs the material scale. Only pawns
 *    and knights get a table; other pieces lean on the central-control term. */
const PAWN_PST: number[][] = [
  [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
  [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
  [0.1, 0.1, 0.2, 0.3, 0.3, 0.2, 0.1, 0.1],
  [0.05, 0.05, 0.1, 0.25, 0.25, 0.1, 0.05, 0.05],
  [0.0, 0.0, 0.0, 0.2, 0.2, 0.0, 0.0, 0.0],
  [0.05, -0.05, -0.1, 0.0, 0.0, -0.1, -0.05, 0.05],
  [0.05, 0.1, 0.1, -0.2, -0.2, 0.1, 0.1, 0.05],
  [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
];

const KNIGHT_PST: number[][] = [
  [-0.5, -0.4, -0.3, -0.3, -0.3, -0.3, -0.4, -0.5],
  [-0.4, -0.2, 0.0, 0.0, 0.0, 0.0, -0.2, -0.4],
  [-0.3, 0.0, 0.1, 0.15, 0.15, 0.1, 0.0, -0.3],
  [-0.3, 0.05, 0.15, 0.2, 0.2, 0.15, 0.05, -0.3],
  [-0.3, 0.0, 0.15, 0.2, 0.2, 0.15, 0.0, -0.3],
  [-0.3, 0.05, 0.1, 0.15, 0.15, 0.1, 0.05, -0.3],
  [-0.4, -0.2, 0.0, 0.05, 0.05, 0.0, -0.2, -0.4],
  [-0.5, -0.4, -0.3, -0.3, -0.3, -0.3, -0.4, -0.5],
];

const isWhitePiece = (p: string) => p !== "" && p === p.toUpperCase();

/** Central-control bonus: files/ranks nearer the middle score higher. */
function centerBonus(r: number, c: number): number {
  const dr = 3.5 - Math.abs(3.5 - r);
  const dc = 3.5 - Math.abs(3.5 - c);
  return (dr + dc) * 0.02;
}

/**
 * Static evaluation, from WHITE's perspective (positive favours White).
 * Combines material, light piece-square tables, and central control. The
 * caller flips the sign for a black-to-move AI.
 */
function evaluate(board: string[][]): number {
  let score = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p === "") continue;
      const white = isWhitePiece(p);
      const lower = p.toLowerCase();
      let v = VALUE[lower] ?? 0;

      // Piece-square tables (mirror the row for black).
      const pr = white ? r : 7 - r;
      if (lower === "p") v += PAWN_PST[pr][c];
      else if (lower === "n") v += KNIGHT_PST[pr][c];
      else v += centerBonus(r, c);

      score += white ? v : -v;
    }
  }
  return score;
}

/** Count of a colour's total legal moves (mobility term, cheap-ish). */
function mobility(board: string[][], white: boolean, ctx: Ctx): number {
  let n = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p === "" || isWhitePiece(p) !== white) continue;
      n += legalMoves(board, r, c, ctx).length;
    }
  }
  return n;
}

/** Enumerate every legal move for the side `white`, capture-first ordered. */
function allMoves(board: string[][], white: boolean, ctx: Ctx): Move[] {
  const caps: Move[] = [];
  const quiet: Move[] = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p === "" || isWhitePiece(p) !== white) continue;
      const isPawn = p.toLowerCase() === "p";
      for (const [tr, tc] of legalMoves(board, r, c, ctx)) {
        const promo = isPawn && (tr === 0 || tr === 7) ? "Q" : undefined;
        const target = board[tr][tc];
        // Diagonal pawn move onto an empty square = en-passant capture.
        const isCap = target !== "" || (isPawn && tc !== c && target === "");
        const m: Move = { from: [r, c], to: [tr, tc], promo };
        if (isCap) caps.push(m);
        else quiet.push(m);
      }
    }
  }
  return caps.concat(quiet);
}

/**
 * Full leaf evaluation from the AI's perspective, including a mobility term
 * and a modest bonus for giving check / big terms for mate. `aiWhite` is the
 * AI's colour; `sideToMove` is whose turn it is in this position.
 */
function evalForAI(board: string[][], aiWhite: boolean, sideToMove: boolean, ctx: Ctx): number {
  const st = statusFor(board, sideToMove, ctx);
  // Terminal positions: the side to move has no legal reply.
  if (st.status === "checkmate") {
    // Side to move is mated → good if that side is the AI's opponent.
    return sideToMove === aiWhite ? -MATE : MATE;
  }
  if (st.status === "stalemate") return 0;

  let score = evaluate(board);           // + = White
  if (!aiWhite) score = -score;          // flip to AI perspective

  // Mobility (small): AI mobility minus opponent mobility.
  const mine = mobility(board, aiWhite, ctx);
  const theirs = mobility(board, !aiWhite, ctx);
  score += (mine - theirs) * 0.05;

  // Modest bonus for giving check (opponent to move is in check).
  if (st.status === "check") {
    score += sideToMove === aiWhite ? -0.4 : 0.4;
  }
  return score;
}

/* ── Node budget: abort a search once it grows too large so a move never
 *    takes more than ~1s, returning the best line found so far. ───────── */
const MAX_NODES = 120000;

/**
 * Quiescence search: keep resolving captures at the leaves so the AI does not
 * stop the search in the middle of a trade and mis-evaluate hanging material.
 */
function quiesce(
  board: string[][],
  ctx: Ctx,
  aiWhite: boolean,
  sideToMove: boolean,
  alpha: number,
  beta: number,
  counter: { n: number }
): number {
  const stand = evalForAI(board, aiWhite, sideToMove, ctx);
  const maximizing = sideToMove === aiWhite;

  if (maximizing) {
    if (stand >= beta) return beta;
    if (stand > alpha) alpha = stand;
  } else {
    if (stand <= alpha) return alpha;
    if (stand < beta) beta = stand;
  }

  if (counter.n >= MAX_NODES) return stand;

  // Only explore captures (and promotions) here.
  for (const m of allMoves(board, sideToMove, ctx)) {
    const target = board[m.to[0]][m.to[1]];
    const isPawn = board[m.from[0]][m.from[1]].toLowerCase() === "p";
    const isCap = target !== "" || (isPawn && m.from[1] !== m.to[1]);
    if (!isCap && !m.promo) continue;

    counter.n++;
    if (counter.n >= MAX_NODES) break;
    const { board: nb, castle, ep } = applyMove(board, m.from, m.to, ctx, m.promo);
    const val = quiesce(nb, { castle, ep }, aiWhite, !sideToMove, alpha, beta, counter);
    if (maximizing) {
      if (val > alpha) alpha = val;
      if (alpha >= beta) break;
    } else {
      if (val < beta) beta = val;
      if (beta <= alpha) break;
    }
  }
  return maximizing ? alpha : beta;
}

/**
 * Alpha-beta (negamax-style but written as explicit min/max for clarity).
 * `sideToMove` is whose turn it is; the AI maximises when it is its own turn.
 */
function alphaBeta(
  board: string[][],
  ctx: Ctx,
  depth: number,
  aiWhite: boolean,
  sideToMove: boolean,
  alpha: number,
  beta: number,
  useQuiescence: boolean,
  counter: { n: number }
): number {
  const st = statusFor(board, sideToMove, ctx);
  if (st.status === "checkmate") return sideToMove === aiWhite ? -MATE - depth : MATE + depth;
  if (st.status === "stalemate") return 0;

  if (depth === 0) {
    return useQuiescence
      ? quiesce(board, ctx, aiWhite, sideToMove, alpha, beta, counter)
      : evalForAI(board, aiWhite, sideToMove, ctx);
  }

  if (counter.n >= MAX_NODES) return evalForAI(board, aiWhite, sideToMove, ctx);

  const moves = allMoves(board, sideToMove, ctx);
  const maximizing = sideToMove === aiWhite;
  let best = maximizing ? -Infinity : Infinity;

  for (const m of moves) {
    counter.n++;
    if (counter.n >= MAX_NODES) break;
    const { board: nb, castle, ep } = applyMove(board, m.from, m.to, ctx, m.promo);
    const val = alphaBeta(nb, { castle, ep }, depth - 1, aiWhite, !sideToMove, alpha, beta, useQuiescence, counter);
    if (maximizing) {
      if (val > best) best = val;
      if (best > alpha) alpha = best;
    } else {
      if (val < best) best = val;
      if (best < beta) beta = best;
    }
    if (alpha >= beta) break;
  }
  return best;
}

/** 1-ply material+position score of a candidate move (AI perspective). */
function greedyScore(board: string[][], m: Move, aiWhite: boolean, ctx: Ctx): number {
  const { board: nb, castle, ep } = applyMove(board, m.from, m.to, ctx, m.promo);
  return evalForAI(nb, aiWhite, !aiWhite, { castle, ep });
}

/**
 * Pick the AI's move for the given position and difficulty.
 * Returns null only when the AI has no legal move (mate/stalemate).
 */
export function bestChessMove(
  board: string[][],
  aiIsWhite: boolean,
  ctx: Ctx,
  difficulty: Difficulty
): Move | null {
  const moves = allMoves(board, aiIsWhite, ctx);
  if (moves.length === 0) return null;

  /* ── facile: shallow, greedy 1-ply on material with heavy noise, but it
   *    still avoids obvious self-destruction and grabs a free mate. ──── */
  if (difficulty === "facile") {
    // Score every move greedily (1-ply).
    const scored = moves.map(m => ({ m, s: greedyScore(board, m, aiIsWhite, ctx) }));
    // If any move delivers mate, always take it.
    const mate = scored.find(x => x.s >= MATE);
    if (mate) return mate.m;

    // ~35% of the time, play a random legal move — but never one that is
    // clearly terrible (loses vs the best by a large margin), so it stays
    // beatable without hanging its queen every move.
    let best = scored[0];
    for (const x of scored) if (x.s > best.s) best = x;
    if (Math.random() < 0.35) {
      const notAwful = scored.filter(x => x.s >= best.s - 3);
      const pool = notAwful.length ? notAwful : scored;
      return pool[Math.floor(Math.random() * pool.length)].m;
    }
    // Otherwise greedy: keep near-ties varied a little via a light tiebreak.
    const ties = scored.filter(x => x.s >= best.s - 0.001);
    return ties[Math.floor(Math.random() * ties.length)].m;
  }

  /* ── moyen / difficile: alpha-beta. ──────────────────────────────── */
  const depth = difficulty === "difficile" ? 4 : 3;
  const useQuiescence = difficulty === "difficile";
  const counter = { n: 0 };

  let bestMove = moves[0];
  let bestVal = -Infinity;
  let alpha = -Infinity;
  const beta = Infinity;

  for (const m of moves) {
    counter.n++;
    const { board: nb, castle, ep } = applyMove(board, m.from, m.to, ctx, m.promo);
    const val = alphaBeta(nb, { castle, ep }, depth - 1, aiIsWhite, !aiIsWhite, alpha, beta, useQuiescence, counter);
    if (val > bestVal) {
      bestVal = val;
      bestMove = m;
      if (val > alpha) alpha = val;
    }
    if (counter.n >= MAX_NODES) break; // budget spent → keep best-so-far
  }

  return bestMove;
}
