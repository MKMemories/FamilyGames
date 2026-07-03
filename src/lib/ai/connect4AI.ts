export type Difficulty = "facile" | "moyen" | "difficile";

const ROWS = 6;
const COLS = 7;

function validCols(board: number[][]): number[] {
  const cols: number[] = [];
  for (let c = 0; c < COLS; c++) if (!board[0][c]) cols.push(c);
  return cols;
}

/** Row a token lands in for `col`, or -1 if the column is full. */
function landingRow(board: number[][], col: number): number {
  for (let r = ROWS - 1; r >= 0; r--) if (!board[r][col]) return r;
  return -1;
}

function isWin(board: number[][], val: number): boolean {
  const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (board[r][c] !== val) continue;
      for (const [dr, dc] of dirs) {
        let n = 1;
        for (let k = 1; k < 4; k++) {
          const nr = r + dr * k, nc = c + dc * k;
          if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS || board[nr][nc] !== val) break;
          n++;
        }
        if (n >= 4) return true;
      }
    }
  }
  return false;
}

function scoreWindow(cells: number[], ai: number, opp: number): number {
  const a = cells.filter(v => v === ai).length;
  const o = cells.filter(v => v === opp).length;
  const e = cells.filter(v => v === 0).length;
  if (a && o) return 0;
  if (a === 4) return 10000;
  if (a === 3 && e === 1) return 60;
  if (a === 2 && e === 2) return 8;
  if (o === 4) return -10000;
  if (o === 3 && e === 1) return -80; // block priority
  if (o === 2 && e === 2) return -6;
  return 0;
}

function evaluate(board: number[][], ai: number): number {
  const opp = ai === 1 ? 2 : 1;
  let score = 0;
  // center column preference
  for (let r = 0; r < ROWS; r++) if (board[r][3] === ai) score += 6;
  const at = (r: number, c: number) => board[r][c];
  // all 4-windows
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c <= COLS - 4; c++)
      score += scoreWindow([at(r, c), at(r, c + 1), at(r, c + 2), at(r, c + 3)], ai, opp);
  for (let c = 0; c < COLS; c++)
    for (let r = 0; r <= ROWS - 4; r++)
      score += scoreWindow([at(r, c), at(r + 1, c), at(r + 2, c), at(r + 3, c)], ai, opp);
  for (let r = 0; r <= ROWS - 4; r++)
    for (let c = 0; c <= COLS - 4; c++) {
      score += scoreWindow([at(r, c), at(r + 1, c + 1), at(r + 2, c + 2), at(r + 3, c + 3)], ai, opp);
      score += scoreWindow([at(r + 3, c), at(r + 2, c + 1), at(r + 1, c + 2), at(r, c + 3)], ai, opp);
    }
  return score;
}

/** Negamax with alpha-beta from the perspective of `cur`. */
function negamax(board: number[][], depth: number, alpha: number, beta: number, cur: number, ai: number): number {
  const opp = cur === 1 ? 2 : 1;
  const cols = validCols(board);
  if (isWin(board, ai === 1 ? 2 : 1)) return -100000 + (10 - depth); // opponent already won before our move
  if (!cols.length || depth === 0) return evaluate(board, ai) * (cur === ai ? 1 : -1);
  let best = -Infinity;
  // order: center-out
  cols.sort((a, b) => Math.abs(3 - a) - Math.abs(3 - b));
  for (const col of cols) {
    const r = landingRow(board, col);
    board[r][col] = cur;
    let val: number;
    if (isWin(board, cur)) val = 100000 - (10 - depth);
    else val = -negamax(board, depth - 1, -beta, -alpha, opp, ai);
    board[r][col] = 0;
    if (val > best) best = val;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best;
}

const DEPTH: Record<Difficulty, number> = { facile: 1, moyen: 4, difficile: 6 };

/** Returns the AI's chosen column (0-6), or -1 if the board is full. */
export function bestConnect4Move(board: number[][], aiVal: number, difficulty: Difficulty): number {
  const cols = validCols(board);
  if (!cols.length) return -1;
  const opp = aiVal === 1 ? 2 : 1;

  // Immediate win, then immediate block — always taken (even on facile it's fair).
  for (const col of cols) {
    const r = landingRow(board, col);
    board[r][col] = aiVal; const w = isWin(board, aiVal); board[r][col] = 0;
    if (w) return col;
  }
  for (const col of cols) {
    const r = landingRow(board, col);
    board[r][col] = opp; const w = isWin(board, opp); board[r][col] = 0;
    if (w) return col;
  }

  if (difficulty === "facile" && Math.random() < 0.55) {
    return cols[Math.floor(Math.random() * cols.length)];
  }

  const depth = DEPTH[difficulty];
  let best = -Infinity;
  let move = cols[0];
  const ordered = [...cols].sort((a, b) => Math.abs(3 - a) - Math.abs(3 - b));
  for (const col of ordered) {
    const r = landingRow(board, col);
    board[r][col] = aiVal;
    const val = isWin(board, aiVal) ? 100000 : -negamax(board, depth - 1, -Infinity, Infinity, opp, aiVal);
    board[r][col] = 0;
    if (val > best) { best = val; move = col; }
  }
  return move;
}
