/* ══════════════════════════════════════════════════════════════════════════
   MOTS FLÉCHÉS — grilles authorées à la main (croisements vérifiés). Chaque mot
   porte sa définition (affichée dans une case-flèche du plateau) ; le modèle est
   dérivé et validé par buildModel() (croisements cohérents, cases-définition
   vides). Réponses sans accent (clavier A-Z) ; les définitions peuvent en avoir.
   ══════════════════════════════════════════════════════════════════════════ */

export type MFDir = "R" | "D";                       // horizontal (→) ou vertical (↓)
export interface MFWord { r: number; c: number; dir: MFDir; answer: string; clue: string; }
export interface MFPuzzle { id: string; name: string; emoji: string; cols: number; rows: number; words: MFWord[]; }

export interface MFClue { text: string; dir: MFDir; wordId: number; }
export interface MFCell { kind: "letter" | "def" | "empty"; sol?: string; clues?: MFClue[]; }
export interface MFWordInfo { id: number; dir: MFDir; clue: string; answer: string; cells: number[]; }
export interface MFModel { cols: number; rows: number; cells: MFCell[]; words: MFWordInfo[]; }

export const MF_PUZZLES: MFPuzzle[] = [
  {
    id: "maison", name: "À la maison", emoji: "🏠", cols: 7, rows: 8,
    words: [
      { r: 3, c: 1, dir: "R", answer: "MAISON", clue: "Là où on habite" },
      { r: 1, c: 1, dir: "D", answer: "ARMES", clue: "Épées et boucliers" },
      { r: 1, c: 3, dir: "D", answer: "PAIRE", clue: "Deux choses identiques" },
      { r: 2, c: 5, dir: "D", answer: "BOA", clue: "Gros serpent" },
      { r: 7, c: 1, dir: "R", answer: "CANARD", clue: "Il fait coin-coin" },
    ],
  },
  {
    id: "cuisine", name: "En cuisine", emoji: "🍽️", cols: 7, rows: 8,
    words: [
      { r: 3, c: 1, dir: "R", answer: "SALADE", clue: "Verte, elle se mange en entrée" },
      { r: 1, c: 1, dir: "D", answer: "TASSE", clue: "Pour boire le café" },
      { r: 1, c: 3, dir: "D", answer: "SALON", clue: "Pièce avec le canapé" },
      { r: 2, c: 5, dir: "D", answer: "ADO", clue: "Adolescent, en court" },
      { r: 7, c: 1, dir: "R", answer: "TORTUE", clue: "Très lente, elle porte sa maison" },
    ],
  },
];

/** Construit et VALIDE le modèle d'affichage d'une grille. Lève en cas
 *  d'incohérence d'auteur (croisement contradictoire ou case-définition occupée). */
export function buildModel(p: MFPuzzle): MFModel {
  const { cols, rows } = p;
  const cells: MFCell[] = Array.from({ length: cols * rows }, () => ({ kind: "empty" as const }));
  const at = (r: number, c: number) => r * cols + c;
  const inB = (r: number, c: number) => r >= 0 && r < rows && c >= 0 && c < cols;
  const words: MFWordInfo[] = [];

  p.words.forEach((w, id) => {
    const letters = w.answer.split("");
    const cellIdx: number[] = [];
    letters.forEach((ch, k) => {
      const r = w.dir === "D" ? w.r + k : w.r;
      const c = w.dir === "R" ? w.c + k : w.c;
      if (!inB(r, c)) throw new Error(`MF ${p.id}: « ${w.answer} » sort de la grille`);
      const cell = cells[at(r, c)];
      if (cell.kind === "letter" && cell.sol !== ch)
        throw new Error(`MF ${p.id}: croisement contradictoire en (${r},${c}) : ${cell.sol} ≠ ${ch} (${w.answer})`);
      cells[at(r, c)] = { kind: "letter", sol: ch };
      cellIdx.push(at(r, c));
    });
    // Case-définition juste avant le mot (à gauche pour →, au-dessus pour ↓).
    const dr = w.dir === "D" ? w.r - 1 : w.r;
    const dc = w.dir === "R" ? w.c - 1 : w.c;
    if (!inB(dr, dc)) throw new Error(`MF ${p.id}: pas de place pour la définition de « ${w.answer} »`);
    const dcell = cells[at(dr, dc)];
    if (dcell.kind === "letter")
      throw new Error(`MF ${p.id}: la case-définition de « ${w.answer} » (${dr},${dc}) est déjà une lettre`);
    const clue: MFClue = { text: w.clue, dir: w.dir, wordId: id };
    cells[at(dr, dc)] = { kind: "def", clues: [...(dcell.clues || []), clue] };
    words.push({ id, dir: w.dir, clue: w.clue, answer: w.answer, cells: cellIdx });
  });

  return { cols, rows, cells, words };
}
