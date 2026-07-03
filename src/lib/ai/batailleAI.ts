/* ════════════════════════════════════════════════════════════════════════
   BATAILLE NAVALE — computer opponent (pure, framework-free, unit-testable).

   No React, no Firebase, no Date.now(). Math.random() is the only source of
   entropy. Everything here operates purely on plain data so it can be unit
   tested in isolation:
     • placeAIFleet()  → a random VALID 10×10 fleet (0 water / 1 ship)
     • chooseAIShot()  → the next cell to fire at, using ONLY the AI's own
                          past shot results (it never sees the enemy grid)
   ════════════════════════════════════════════════════════════════════════ */

export type Difficulty = "facile" | "moyen" | "difficile";

/** Ship lengths, largest first. 5+4+3+3+2 = 17 ship cells. */
export const FLEET_SIZES: number[] = [5, 4, 3, 3, 2];

const SIZE = 10;

const key = (r: number, c: number) => `${r}-${c}`;
const inBounds = (r: number, c: number) => r >= 0 && r < SIZE && c >= 0 && c < SIZE;

/** Random element of a non-empty array. */
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/* ── Fleet placement ─────────────────────────────────────────────────── */

/** One attempt at a full valid fleet; returns null if it painted itself into
 *  a corner (caller retries). */
function tryPlaceFleet(): number[][] | null {
  const grid = Array.from({ length: SIZE }, () => Array<number>(SIZE).fill(0));
  for (const size of FLEET_SIZES) {
    let placed = false;
    for (let t = 0; t < 500 && !placed; t++) {
      const horizontal = Math.random() < 0.5;
      const r = Math.floor(Math.random() * (horizontal ? SIZE : SIZE - size + 1));
      const c = Math.floor(Math.random() * (horizontal ? SIZE - size + 1 : SIZE));
      const cells: [number, number][] = [];
      for (let i = 0; i < size; i++) cells.push(horizontal ? [r, c + i] : [r + i, c]);
      if (cells.some(([cr, cc]) => grid[cr][cc] === 1)) continue; // overlap
      cells.forEach(([cr, cc]) => (grid[cr][cc] = 1));
      placed = true;
    }
    if (!placed) return null;
  }
  return grid;
}

/** A random VALID 10×10 fleet: ships straight, in-bounds, non-overlapping.
 *  Always succeeds (retries until valid). */
export function placeAIFleet(): number[][] {
  for (let attempt = 0; attempt < 1000; attempt++) {
    const grid = tryPlaceFleet();
    if (grid) return grid;
  }
  // Statistically unreachable; return an empty water grid rather than throw.
  return Array.from({ length: SIZE }, () => Array<number>(SIZE).fill(0));
}

/* ── Firing ──────────────────────────────────────────────────────────── */

type ShotMap = Record<string, "hit" | "miss">;

/** Every untried, in-bounds cell. */
function untriedCells(shots: ShotMap): [number, number][] {
  const out: [number, number][] = [];
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++)
      if (shots[key(r, c)] === undefined) out.push([r, c]);
  return out;
}

/** All cells the AI has already scored as a hit. */
function hitCells(shots: ShotMap): [number, number][] {
  const out: [number, number][] = [];
  for (const k in shots) {
    if (shots[k] !== "hit") continue;
    const [r, c] = k.split("-").map(Number);
    out.push([r, c]);
  }
  return out;
}

const ORTHO: [number, number][] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

/** Untried orthogonal neighbours of any known hit — the hunt/target frontier. */
function targetNeighbours(shots: ShotMap, hits: [number, number][]): [number, number][] {
  const out: [number, number][] = [];
  const seen = new Set<string>();
  for (const [r, c] of hits) {
    for (const [dr, dc] of ORTHO) {
      const nr = r + dr;
      const nc = c + dc;
      const k = key(nr, nc);
      if (!inBounds(nr, nc) || shots[k] !== undefined || seen.has(k)) continue;
      seen.add(k);
      out.push([nr, nc]);
    }
  }
  return out;
}

/** When two in-line hits exist, the untried cells extending that line at
 *  either end. Prioritised on "difficile" so a found ship is finished off
 *  along its axis instead of poking around. */
function lineExtensions(shots: ShotMap, hits: [number, number][]): [number, number][] {
  const hitSet = new Set(hits.map(([r, c]) => key(r, c)));
  const out: [number, number][] = [];
  const seen = new Set<string>();
  const add = (r: number, c: number) => {
    const k = key(r, c);
    if (inBounds(r, c) && shots[k] === undefined && !seen.has(k)) {
      seen.add(k);
      out.push([r, c]);
    }
  };
  for (const [r, c] of hits) {
    // horizontal line: (r,c) & (r,c+1) both hit → extend to both ends
    if (hitSet.has(key(r, c + 1))) {
      let cl = c;
      while (hitSet.has(key(r, cl - 1))) cl--;
      let cr = c + 1;
      while (hitSet.has(key(r, cr + 1))) cr++;
      add(r, cl - 1);
      add(r, cr + 1);
    }
    // vertical line: (r,c) & (r+1,c) both hit → extend to both ends
    if (hitSet.has(key(r + 1, c))) {
      let ru = r;
      while (hitSet.has(key(ru - 1, c))) ru--;
      let rd = r + 1;
      while (hitSet.has(key(rd + 1, c))) rd++;
      add(ru - 1, c);
      add(rd + 1, c);
    }
  }
  return out;
}

/**
 * Choose the next cell to fire at, using ONLY the AI's own past shot results.
 * Always returns an untried cell inside the 10×10 grid.
 *
 * facile     — uniformly random untried cell.
 * moyen      — hunt/target: fire at an untried orthogonal neighbour of a hit
 *              if any exist, else random untried.
 * difficile  — hunt/target PLUS line-extension of two in-line hits, and a
 *              parity/checkerboard mask ((r+c) even) while hunting to roughly
 *              halve the search. Always falls back to any untried cell.
 */
export function chooseAIShot(shots: ShotMap, difficulty: Difficulty): [number, number] {
  const safeShots = shots || {};

  if (difficulty === "facile") {
    const cells = untriedCells(safeShots);
    return cells.length ? pick(cells) : [0, 0];
  }

  const hits = hitCells(safeShots);

  if (difficulty === "difficile" && hits.length >= 2) {
    const ext = lineExtensions(safeShots, hits);
    if (ext.length) return pick(ext);
  }

  // moyen & difficile: target the frontier around known hits.
  const frontier = targetNeighbours(safeShots, hits);
  if (frontier.length) return pick(frontier);

  // Hunt mode.
  if (difficulty === "difficile") {
    const parity = untriedCells(safeShots).filter(([r, c]) => (r + c) % 2 === 0);
    if (parity.length) return pick(parity);
  }

  const cells = untriedCells(safeShots);
  return cells.length ? pick(cells) : [0, 0];
}
