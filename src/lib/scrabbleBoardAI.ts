import { validateMove, BOARD_SIZE, CENTER, BLANK, type Board, type Placement } from "./scrabbleBoard";
import { normalizeWord } from "./frenchDict";

/* ══════════════════════════════════════════════════════════════════════════
   IA du Grand Scrabble — génère un coup légal.
   1er coup : mot du chevalet posé par le centre. Coups suivants : « accroche »
   sur une tuile existante. validateMove() garantit la légalité finale, donc la
   génération peut rester heuristique sans jamais produire un coup illégal.
   Budget d'essais borné → temps de réponse raisonnable.
   ══════════════════════════════════════════════════════════════════════════ */

export type Difficulty = "facile" | "moyen" | "difficile";

interface Candidate { placements: Placement[]; total: number; }

const inb = (r: number, c: number) => r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE;

/** Peut-on écrire `word`, sachant que certaines positions sont déjà fixées par
 *  le plateau (fixed[i] = lettre imposée) et que les autres viennent du chevalet ?
 *  Renvoie, pour chaque position libre, si on doit utiliser un blanc. */
function assign(word: string, fixed: (string | null)[], rackCount: Record<string, number>): (boolean | null)[] | null {
  const need: Record<string, number> = {};
  const use: (boolean | null)[] = [];
  const rc = { ...rackCount };
  for (let i = 0; i < word.length; i++) {
    if (fixed[i] != null) {
      if (fixed[i] !== word[i]) return null; // conflit avec le plateau
      use.push(null);
      continue;
    }
    const ch = word[i];
    if ((rc[ch] || 0) > 0) { rc[ch]--; use.push(false); }
    else if ((rc[BLANK] || 0) > 0) { rc[BLANK]--; use.push(true); need[ch] = 0; }
    else return null;
  }
  return use;
}

/** Cherche le meilleur coup (ou un coup selon la difficulté). */
export function bestScrabbleMove(
  board: Board,
  rack: string[],
  dict: Set<string> | null,
  difficulty: Difficulty,
  rnd: () => number,
): Candidate | null {
  if (!dict || dict.size === 0) return null;
  const rackCount: Record<string, number> = {};
  rack.forEach(l => { rackCount[l] = (rackCount[l] || 0) + 1; });
  const rackLen = rack.length;

  const boardEmpty = board.every(row => row.every(c => !c));
  const words: string[] = [];
  for (const w of dict) { if (w.length >= 2 && w.length <= rackLen) words.push(w); }

  const found: Candidate[] = [];
  let budget = 20000;      // nb max de validations complètes
  let attempts = 90000;    // borne DURE sur le travail total (anti-blocage mobile)
  const consider = (placements: Placement[]) => {
    if (budget-- <= 0) return;
    const res = validateMove(board, placements, dict);
    if (res.ok) found.push({ placements, total: res.total });
  };

  const tryLine = (r: number, c: number, dr: number, dc: number, word: string) => {
    if (--attempts < 0) return;
    // (r,c) = case de départ du mot ; vérifie bornes + prépare fixed[]
    const fixed: (string | null)[] = [];
    for (let i = 0; i < word.length; i++) {
      const rr = r + dr * i, cc = c + dc * i;
      if (!inb(rr, cc)) return;
      fixed.push(board[rr][cc] ? board[rr][cc]!.l : null);
    }
    // La case juste avant / juste après doit être vide (sinon le mot est tronqué)
    if (inb(r - dr, c - dc) && board[r - dr][c - dc]) return;
    const er = r + dr * word.length, ec = c + dc * word.length;
    if (inb(er, ec) && board[er][ec]) return;

    const use = assign(word, fixed, rackCount);
    if (!use) return;
    const placements: Placement[] = [];
    for (let i = 0; i < word.length; i++) {
      if (fixed[i] != null) continue; // tuile déjà sur le plateau
      placements.push({ r: r + dr * i, c: c + dc * i, l: word[i], blank: use[i] === true });
    }
    if (placements.length === 0) return;
    consider(placements);
  };

  if (boardEmpty) {
    // 1er coup : le mot doit couvrir le centre. On l'aligne horizontalement.
    for (const w of words) {
      for (let off = 0; off < w.length; off++) {
        const c = CENTER - off;
        if (c < 0 || c + w.length > BOARD_SIZE) continue;
        tryLine(CENTER, c, 0, 1, w);
      }
      if (budget <= 0 || attempts <= 0) break;
    }
  } else {
    // Coups suivants : accroche chaque mot sur une tuile existante.
    const anchors: [number, number, string][] = [];
    for (let r = 0; r < BOARD_SIZE; r++) for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c]) anchors.push([r, c, board[r][c]!.l]);
    }
    for (const [ar, ac, al] of anchors) {
      for (const w of words) {
        for (let i = 0; i < w.length; i++) {
          if (normalizeWord(w[i]) !== al) continue; // la lettre du mot doit matcher l'ancre
          // Horizontal : le mot passe par (ar,ac) avec w[i] sur l'ancre
          tryLine(ar, ac - i, 0, 1, w);
          // Vertical
          tryLine(ar - i, ac, 1, 0, w);
        }
        if (budget <= 0 || attempts <= 0) break;
      }
      if (budget <= 0 || attempts <= 0) break;
    }
  }

  if (found.length === 0) return null;
  found.sort((a, b) => b.total - a.total);
  // Difficulté : difficile = meilleur ; moyen = milieu ; facile = plutôt faible.
  const pick = difficulty === "difficile" ? 0
    : difficulty === "moyen" ? Math.floor(found.length * 0.4)
    : Math.min(found.length - 1, Math.floor(found.length * 0.75));
  return found[Math.min(pick, found.length - 1)] ?? found[0];
}
