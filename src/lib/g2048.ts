/* ══════════════════════════════════════════════════════════════════════════
   2048 — moteur pur à base de tuiles (id stable → glissement animé). move() fait
   glisser + fusionner dans une direction ; renvoie survivants, tuiles absorbées
   (pour l'animation), gain et si le plateau a bougé. Testable et déterministe.
   ══════════════════════════════════════════════════════════════════════════ */

export const SIZE = 4;
export type Dir = "up" | "down" | "left" | "right";
export interface Tile { id: number; r: number; c: number; val: number; }

/** Cases d'une « ligne » de déplacement, du fond vers l'arrière (front d'abord). */
function lines(dir: Dir): [number, number][][] {
  const out: [number, number][][] = [];
  for (let k = 0; k < SIZE; k++) {
    const line: [number, number][] = [];
    for (let i = 0; i < SIZE; i++) {
      if (dir === "left") line.push([k, i]);
      else if (dir === "right") line.push([k, SIZE - 1 - i]);
      else if (dir === "up") line.push([i, k]);
      else line.push([SIZE - 1 - i, k]);
    }
    out.push(line);
  }
  return out;
}

export function move(tiles: Tile[], dir: Dir): { survivors: Tile[]; absorbed: Tile[]; moved: boolean; gain: number; mergedIds: number[] } {
  const cell: (Tile | null)[][] = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
  tiles.forEach(t => { cell[t.r][t.c] = t; });
  const map = new Map<number, Tile>(tiles.map(t => [t.id, { ...t }]));
  let moved = false, gain = 0;
  const absorbed: Tile[] = [];
  const mergedIds: number[] = [];

  for (const line of lines(dir)) {
    const inLine = line.map(([r, c]) => cell[r][c]).filter((t): t is Tile => !!t);
    let pos = 0, i = 0;
    while (i < inLine.length) {
      const t = inLine[i];
      const [tr, tc] = line[pos];
      if (i + 1 < inLine.length && inLine[i + 1].val === t.val) {
        const surv = map.get(t.id)!, ab = map.get(inLine[i + 1].id)!;
        surv.r = tr; surv.c = tc; surv.val = t.val * 2; mergedIds.push(surv.id);
        ab.r = tr; ab.c = tc; absorbed.push(ab);
        gain += t.val * 2; moved = true;
        i += 2; pos++;
      } else {
        const surv = map.get(t.id)!;
        if (surv.r !== tr || surv.c !== tc) moved = true;
        surv.r = tr; surv.c = tc;
        i++; pos++;
      }
    }
  }

  const absorbedIds = new Set(absorbed.map(a => a.id));
  const survivors = [...map.values()].filter(t => !absorbedIds.has(t.id));
  return { survivors, absorbed, moved, gain, mergedIds };
}

export function emptyCells(tiles: Tile[]): [number, number][] {
  const taken = new Set(tiles.map(t => t.r * SIZE + t.c));
  const out: [number, number][] = [];
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) if (!taken.has(r * SIZE + c)) out.push([r, c]);
  return out;
}

/** Peut-on encore jouer ? (une case vide, ou deux voisines égales) */
export function hasMoves(tiles: Tile[]): boolean {
  if (emptyCells(tiles).length) return true;
  const g: number[][] = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
  tiles.forEach(t => { g[t.r][t.c] = t.val; });
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
    if (c + 1 < SIZE && g[r][c] === g[r][c + 1]) return true;
    if (r + 1 < SIZE && g[r][c] === g[r + 1][c]) return true;
  }
  return false;
}

export function bestTile(tiles: Tile[]): number {
  return tiles.reduce((m, t) => Math.max(m, t.val), 0);
}
