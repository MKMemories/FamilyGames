import { legalMoves, applyMoveFull, hasAnyMove, type Move } from "../checkersRules";

export type Difficulty = "facile" | "moyen" | "difficile";

/** Static evaluation from the AI's perspective (material + man advancement). */
function evaluate(board: number[][], aiIdx: number): number {
  let score = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const v = board[r][c];
      if (!v) continue;
      const owner = v === 1 || v === 3 ? 0 : 1;
      const king = v === 3 || v === 4;
      let val = king ? 3.0 : 1.0;            // flying kings are strong
      if (!king) val += (owner === 0 ? 7 - r : r) * 0.06; // advancement toward crowning
      val += (3.5 - Math.abs(3.5 - c)) * 0.02;            // mild central bias
      score += owner === aiIdx ? val : -val;
    }
  }
  return score;
}

const DEPTH: Record<Difficulty, number> = { facile: 0, moyen: 4, difficile: 6 };
const NODE_CAP = 220000;

function bestCheckersTurnImpl(board: number[][], aiIdx: number, difficulty: Difficulty): Move | null {
  const moves = legalMoves(board, aiIdx);
  if (!moves.length) return null;
  if (difficulty === "facile") return moves[Math.floor(Math.random() * moves.length)];

  let nodes = 0;
  const minimax = (b: number[][], toMove: number, depth: number, alpha: number, beta: number): number => {
    if (!hasAnyMove(b, toMove)) return toMove === aiIdx ? -10000 + (10 - depth) : 10000 - (10 - depth);
    if (depth <= 0 || nodes > NODE_CAP) return evaluate(b, aiIdx);
    const ms = legalMoves(b, toMove);
    const next = toMove === 0 ? 1 : 0;
    if (toMove === aiIdx) {
      let best = -Infinity;
      for (const m of ms) {
        nodes++;
        const nb = applyMoveFull(b, m, toMove).board;
        const s = minimax(nb, next, depth - 1, alpha, beta);
        if (s > best) best = s;
        if (best > alpha) alpha = best;
        if (alpha >= beta) break;
      }
      return best;
    }
    let best = Infinity;
    for (const m of ms) {
      nodes++;
      const nb = applyMoveFull(b, m, toMove).board;
      const s = minimax(nb, next, depth - 1, alpha, beta);
      if (s < best) best = s;
      if (best < beta) beta = best;
      if (alpha >= beta) break;
    }
    return best;
  };

  const depth = DEPTH[difficulty];
  const next = aiIdx === 0 ? 1 : 0;
  let best = -Infinity;
  let chosen: Move | null = null;
  for (const m of moves) {
    const nb = applyMoveFull(board, m, aiIdx).board;
    const s = minimax(nb, next, depth - 1, -Infinity, Infinity);
    if (s > best) { best = s; chosen = m; }
  }
  return chosen ?? moves[0];
}

/** Returns the AI's chosen full move (a quiet step or a whole capture chain). */
export function bestCheckersTurn(board: number[][], aiIdx: number, difficulty: Difficulty): Move | null {
  return bestCheckersTurnImpl(board, aiIdx, difficulty);
}
