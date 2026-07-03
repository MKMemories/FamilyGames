export type Difficulty = "facile" | "moyen" | "difficile";

const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

function winnerOf(c: string[]): string {
  for (const [a, b, d] of LINES) {
    if (c[a] && c[a] === c[b] && c[a] === c[d]) return c[a];
  }
  return "";
}

/** Perfect-play minimax with depth preference (win fast, lose slow). */
function minimax(c: string[], ai: string, human: string, turn: string, depth: number): number {
  const w = winnerOf(c);
  if (w === ai) return 10 - depth;
  if (w === human) return depth - 10;
  if (c.every(x => x)) return 0;
  let best = turn === ai ? -Infinity : Infinity;
  for (let i = 0; i < 9; i++) {
    if (c[i]) continue;
    c[i] = turn;
    const s = minimax(c, ai, human, turn === ai ? human : ai, depth + 1);
    c[i] = "";
    best = turn === ai ? Math.max(best, s) : Math.min(best, s);
  }
  return best;
}

function optimalMove(cells: string[], aiMark: string): number {
  const human = aiMark === "X" ? "O" : "X";
  let best = -Infinity;
  let move = -1;
  for (let i = 0; i < 9; i++) {
    if (cells[i]) continue;
    const c = [...cells];
    c[i] = aiMark;
    const s = minimax(c, aiMark, human, human, 0);
    if (s > best) { best = s; move = i; }
  }
  return move;
}

/** Returns the AI's chosen cell index (0-8), or -1 if the board is full. */
export function bestMorpionMove(cells: string[], aiMark: string, difficulty: Difficulty): number {
  const empties: number[] = [];
  for (let i = 0; i < 9; i++) if (!cells[i]) empties.push(i);
  if (!empties.length) return -1;
  const randomMove = () => empties[Math.floor(Math.random() * empties.length)];
  // Easier levels blunder on purpose; hard is unbeatable.
  if (difficulty === "facile") return Math.random() < 0.7 ? randomMove() : optimalMove(cells, aiMark);
  if (difficulty === "moyen") return Math.random() < 0.45 ? randomMove() : optimalMove(cells, aiMark);
  return optimalMove(cells, aiMark);
}
