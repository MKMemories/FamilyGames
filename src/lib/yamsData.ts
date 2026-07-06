/* ══════════════════════════════════════════════════════════════════════════
   YAM'S — jeu des 5 dés (feuille de score). Combinaisons classiques : section
   haute (As…Six) avec bonus à 63, puis brelan, carré, full, suites, Yam's et
   chance. Toute la logique de score est ici (pure) → testable et sans surprise.
   ══════════════════════════════════════════════════════════════════════════ */

export interface YamCat {
  id: string;
  name: string;
  hint: string;
  up?: number;      // section haute : valeur de face visée
  upper?: boolean;  // appartient à la section haute (pour le bonus)
}

export const YAM_CATS: YamCat[] = [
  { id: "un", name: "As", hint: "Somme des ⚀", up: 1, upper: true },
  { id: "deux", name: "Deux", hint: "Somme des ⚁", up: 2, upper: true },
  { id: "trois", name: "Trois", hint: "Somme des ⚂", up: 3, upper: true },
  { id: "quatre", name: "Quatre", hint: "Somme des ⚃", up: 4, upper: true },
  { id: "cinq", name: "Cinq", hint: "Somme des ⚄", up: 5, upper: true },
  { id: "six", name: "Six", hint: "Somme des ⚅", up: 6, upper: true },
  { id: "brelan", name: "Brelan", hint: "3 identiques → somme des dés" },
  { id: "carre", name: "Carré", hint: "4 identiques → somme des dés" },
  { id: "full", name: "Full", hint: "3 + 2 identiques → 25 pts" },
  { id: "petite", name: "Petite suite", hint: "4 dés qui se suivent → 30 pts" },
  { id: "grande", name: "Grande suite", hint: "5 dés qui se suivent → 40 pts" },
  { id: "yams", name: "Yam's", hint: "5 identiques → 50 pts" },
  { id: "chance", name: "Chance", hint: "Somme de tous les dés" },
];

export const UPPER_BONUS = 35;
export const UPPER_TARGET = 63;

/** Score d'une catégorie pour un jet de dés donné (5 dés, valeurs 1-6). */
export function scoreFor(catId: string, dice: number[]): number {
  const counts = [0, 0, 0, 0, 0, 0, 0]; // index 1..6
  dice.forEach(d => { if (d >= 1 && d <= 6) counts[d]++; });
  const sum = dice.reduce((a, b) => a + b, 0);
  const has = (n: number) => counts.some(c => c >= n);
  const uniq = new Set(dice.filter(d => d >= 1 && d <= 6));
  const runOf = (arr: number[]) => arr.every(n => uniq.has(n));
  switch (catId) {
    case "un": return counts[1] * 1;
    case "deux": return counts[2] * 2;
    case "trois": return counts[3] * 3;
    case "quatre": return counts[4] * 4;
    case "cinq": return counts[5] * 5;
    case "six": return counts[6] * 6;
    case "brelan": return has(3) ? sum : 0;
    case "carre": return has(4) ? sum : 0;
    case "full": return (counts.some(c => c === 3) && counts.some(c => c === 2)) || has(5) ? 25 : 0;
    case "petite": return (runOf([1, 2, 3, 4]) || runOf([2, 3, 4, 5]) || runOf([3, 4, 5, 6])) ? 30 : 0;
    case "grande": return (runOf([1, 2, 3, 4, 5]) || runOf([2, 3, 4, 5, 6])) ? 40 : 0;
    case "yams": return has(5) ? 50 : 0;
    case "chance": return sum;
    default: return 0;
  }
}

/** Sous-total de la section haute (As…Six) pour une feuille de score. */
export function upperSum(sheet: Record<string, number>): number {
  return YAM_CATS.filter(c => c.upper).reduce((s, c) => s + (sheet[c.id] ?? 0), 0);
}

/** Total complet d'un joueur (haut + bonus éventuel + bas). */
export function totalScore(sheet: Record<string, number> | undefined): number {
  const s = sheet || {};
  const up = upperSum(s);
  const bonus = up >= UPPER_TARGET ? UPPER_BONUS : 0;
  const all = YAM_CATS.reduce((t, c) => t + (s[c.id] ?? 0), 0);
  return all + bonus;
}

/** true si toutes les catégories sont remplies. */
export function sheetComplete(sheet: Record<string, number> | undefined): boolean {
  const s = sheet || {};
  return YAM_CATS.every(c => s[c.id] !== undefined);
}

/** Lance les dés non conservés (renvoie un nouveau tableau de 5 dés). */
export function rollDice(prev: number[] | null, held: boolean[], rnd: () => number = Math.random): number[] {
  return Array.from({ length: 5 }, (_, i) =>
    prev && held[i] ? prev[i] : 1 + Math.floor(rnd() * 6)
  );
}

/* ── IA : choisit les dés à garder puis la meilleure case à cocher. ── */

/** Garde les faces les plus fréquentes (heuristique simple mais efficace). */
export function aiHolds(dice: number[]): boolean[] {
  const counts = [0, 0, 0, 0, 0, 0, 0];
  dice.forEach(d => counts[d]++);
  // valeur la plus fréquente (à égalité, la plus grande)
  let best = 1;
  for (let v = 1; v <= 6; v++) if (counts[v] > counts[best] || (counts[v] === counts[best] && v > best)) best = v;
  // si on tient déjà une suite prometteuse, garder les uniques
  const uniq = new Set(dice);
  const straightish = [1, 2, 3, 4, 5, 6].filter(n => uniq.has(n)).length >= 4;
  return dice.map(d => (straightish ? counts[d] === 1 : d === best));
}

/** Choisit la catégorie libre au meilleur rendement (sacrifie une case faible sinon). */
export function aiPickCategory(dice: number[], sheet: Record<string, number>): string {
  const free = YAM_CATS.filter(c => sheet[c.id] === undefined);
  if (free.length === 0) return "chance";
  const scored = free.map(c => ({ id: c.id, s: scoreFor(c.id, dice) }));
  const max = Math.max(...scored.map(x => x.s));
  if (max > 0) return scored.filter(x => x.s === max).sort((a, b) => weight(b.id) - weight(a.id))[0].id;
  // tout à zéro : sacrifier la case la moins précieuse (As en priorité)
  const order = ["un", "deux", "trois", "brelan", "carre", "yams", "full", "petite", "grande", "quatre", "cinq", "six", "chance"];
  return order.find(id => sheet[id] === undefined) || free[0].id;
}

function weight(id: string): number {
  // à score égal, préférer verrouiller les grosses combinaisons
  const w: Record<string, number> = { yams: 9, grande: 8, carre: 7, full: 6, petite: 5, brelan: 4, chance: 1 };
  return w[id] ?? 2;
}
