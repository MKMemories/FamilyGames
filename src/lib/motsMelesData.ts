/* ══════════════════════════════════════════════════════════════════════════
   MOTS MÊLÉS — génération d'une grille : on place les mots d'un thème dans 8
   directions (horizontal, vertical, diagonales, à l'endroit ou à l'envers) sans
   conflit, puis on comble avec des lettres aléatoires. Thèmes variés → pas de
   répétition. Réponses sans accent (grille A-Z). Pur et testable.
   ══════════════════════════════════════════════════════════════════════════ */

export interface MMTheme { id: string; name: string; emoji: string; words: string[]; }

export const MM_THEMES: MMTheme[] = [
  { id: "animaux", name: "Les animaux", emoji: "🦊", words: ["LION", "TIGRE", "ZEBRE", "PANDA", "KOALA", "RENARD", "CHEVAL", "SOURIS", "DAUPHIN", "TORTUE"] },
  { id: "fruits", name: "Fruits & légumes", emoji: "🍎", words: ["POMME", "BANANE", "CERISE", "FRAISE", "CAROTTE", "TOMATE", "RAISIN", "MELON", "POIRE", "KIWI"] },
  { id: "sport", name: "Le sport", emoji: "⚽", words: ["FOOT", "TENNIS", "JUDO", "RUGBY", "NAGE", "VELO", "BOXE", "SKI", "GOLF", "DANSE"] },
  { id: "maison", name: "La maison", emoji: "🏠", words: ["SALON", "CUISINE", "LAMPE", "CHAISE", "TABLE", "PORTE", "LIT", "MIROIR", "TAPIS", "JARDIN"] },
  { id: "nature", name: "La nature", emoji: "🌿", words: ["SOLEIL", "NUAGE", "RIVIERE", "FORET", "PLAGE", "MONTAGNE", "FLEUR", "ARBRE", "VOLCAN", "OCEAN"] },
  { id: "voyage", name: "En voyage", emoji: "✈️", words: ["AVION", "TRAIN", "VALISE", "PLAGE", "HOTEL", "ROUTE", "BATEAU", "CARTE", "GARE", "PASSEPORT"] },
];

export interface MMCell { ch: string; }
export interface MMWordPlace { word: string; cells: [number, number][]; found: boolean; }
export interface MMGrid { size: number; grid: string[][]; words: MMWordPlace[]; }

const DIRS: [number, number][] = [[0, 1], [1, 0], [1, 1], [1, -1], [0, -1], [-1, 0], [-1, -1], [-1, 1]];
const LETTERS = "AEIOULNRSTMBCDPGFHV";

function shuffle<T>(a: T[], rnd: () => number): T[] {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; }
  return r;
}

/** Tente de placer un mot ; renvoie les cases si réussi. */
function tryPlace(grid: (string | null)[][], size: number, word: string, rnd: () => number): [number, number][] | null {
  const starts: [number, number][] = [];
  for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) starts.push([r, c]);
  for (const [dr, dc] of shuffle(DIRS, rnd)) {
    for (const [sr, sc] of shuffle(starts, rnd)) {
      const cells: [number, number][] = [];
      let ok = true;
      for (let i = 0; i < word.length; i++) {
        const r = sr + dr * i, c = sc + dc * i;
        if (r < 0 || r >= size || c < 0 || c >= size) { ok = false; break; }
        const g = grid[r][c];
        if (g !== null && g !== word[i]) { ok = false; break; }
        cells.push([r, c]);
      }
      if (ok) return cells;
    }
  }
  return null;
}

/** Génère une grille pour un thème. `size` s'adapte au plus long mot. */
export function generate(theme: MMTheme, rnd: () => number = Math.random): MMGrid {
  const longest = Math.max(...theme.words.map(w => w.length));
  const size = Math.min(14, Math.max(10, longest + 2));
  const words = shuffle(theme.words, rnd).slice(0, 9); // jusqu'à 9 mots

  // plusieurs essais pour tout caser
  for (let attempt = 0; attempt < 40; attempt++) {
    const grid: (string | null)[][] = Array.from({ length: size }, () => Array(size).fill(null));
    const placed: MMWordPlace[] = [];
    let allOk = true;
    for (const w of words) {
      const cells = tryPlace(grid, size, w, rnd);
      if (!cells) { allOk = false; break; }
      cells.forEach(([r, c], i) => { grid[r][c] = w[i]; });
      placed.push({ word: w, cells, found: false });
    }
    if (!allOk) continue;
    // comble les vides
    for (let r = 0; r < size; r++) for (let c = 0; c < size; c++)
      if (grid[r][c] === null) grid[r][c] = LETTERS[Math.floor(rnd() * LETTERS.length)];
    return { size, grid: grid as string[][], words: placed };
  }
  // secours (ne devrait pas arriver) : grille pleine de lettres, mots réduits
  const grid: string[][] = Array.from({ length: size }, () => Array.from({ length: size }, () => LETTERS[Math.floor(rnd() * LETTERS.length)]));
  return { size, grid, words: [] };
}

/** Les cases (a,b) forment-elles le mot placé w ? (dans un sens ou l'autre) */
export function matchWord(w: MMWordPlace, a: [number, number], b: [number, number]): boolean {
  const first = w.cells[0], last = w.cells[w.cells.length - 1];
  const same = (x: [number, number], y: [number, number]) => x[0] === y[0] && x[1] === y[1];
  return (same(a, first) && same(b, last)) || (same(a, last) && same(b, first));
}

/** Toutes les cases d'un segment ligne/colonne/diagonale entre a et b (inclus), ou null. */
export function segment(a: [number, number], b: [number, number]): [number, number][] | null {
  const dr = Math.sign(b[0] - a[0]), dc = Math.sign(b[1] - a[1]);
  const lenR = Math.abs(b[0] - a[0]), lenC = Math.abs(b[1] - a[1]);
  if (!(lenR === 0 || lenC === 0 || lenR === lenC)) return null; // pas aligné
  const len = Math.max(lenR, lenC);
  const cells: [number, number][] = [];
  for (let i = 0; i <= len; i++) cells.push([a[0] + dr * i, a[1] + dc * i]);
  return cells;
}
