/* ══════════════════════════════════════════════════════════════════════════
   AWALÉ (Oware) — jeu de semailles africain, 2 joueurs. Plateau de 12 trous
   (2 rangées de 6), 4 graines par trou au départ. On sème dans le sens anti-
   horaire ; on capture les 2 ou 3 graines finales dans le camp adverse (et en
   remontant). Toute la logique de règles est ici (pure) → testable et fiable.

   Indices : 0-5 = camp du joueur 0 (bas, gauche→droite),
             6-11 = camp du joueur 1 (haut). Le semis va 0→1→…→11→0.
   ══════════════════════════════════════════════════════════════════════════ */

export const AW_PITS = 12;
export const AW_SEEDS = 48;

export function newBoard(): number[] {
  return Array(AW_PITS).fill(4);
}

export function ownPits(player: 0 | 1): number[] {
  return player === 0 ? [0, 1, 2, 3, 4, 5] : [6, 7, 8, 9, 10, 11];
}
export function oppPits(player: 0 | 1): number[] {
  return player === 0 ? [6, 7, 8, 9, 10, 11] : [0, 1, 2, 3, 4, 5];
}
const inOpp = (player: 0 | 1, i: number) => (player === 0 ? i >= 6 : i <= 5);
export const sideSum = (b: number[], pits: number[]) => pits.reduce((s, i) => s + b[i], 0);

/** Sème les graines du trou choisi (anti-horaire, saute le trou d'origine). */
export function sow(board: number[], pit: number): { b: number[]; last: number } {
  const b = [...board];
  let n = b[pit];
  b[pit] = 0;
  let i = pit;
  while (n > 0) {
    i = (i + 1) % AW_PITS;
    if (i === pit) continue; // on ne resème jamais dans le trou de départ
    b[i]++; n--;
  }
  return { b, last: i };
}

/** Applique un coup complet : semis + capture (avec garde « grand chelem »). */
export function applyMove(board: number[], player: 0 | 1, pit: number): { board: number[]; captured: number } {
  const { b, last } = sow(board, pit);
  // Récolte : à partir du dernier trou, tant qu'on est chez l'adversaire avec 2 ou 3.
  const collect: number[] = [];
  let i = last;
  while (inOpp(player, i) && (b[i] === 2 || b[i] === 3)) {
    collect.push(i);
    i = (i - 1 + AW_PITS) % AW_PITS;
  }
  const capSum = collect.reduce((s, idx) => s + b[idx], 0);
  const oppTotal = sideSum(b, oppPits(player));
  // Grand chelem : un coup qui raflerait TOUT le camp adverse ne capture rien.
  if (capSum > 0 && capSum < oppTotal) {
    collect.forEach(idx => { b[idx] = 0; });
    return { board: b, captured: capSum };
  }
  return { board: b, captured: 0 };
}

/** Coups légaux (respecte la règle de « nourrissage » si le camp adverse est vide). */
export function legalMoves(board: number[], player: 0 | 1): number[] {
  const own = ownPits(player).filter(i => board[i] > 0);
  if (sideSum(board, oppPits(player)) === 0) {
    // l'adversaire n'a plus rien : on doit jouer un coup qui le nourrit
    const feeders = own.filter(i => sideSum(sow(board, i).b, oppPits(player)) > 0);
    return feeders;
  }
  return own;
}

/**
 * Résout l'état après un coup : met à jour les greniers, détecte la fin de
 * partie et récolte les graines restantes le cas échéant.
 * @returns le plateau, les greniers, le prochain joueur et si la partie est finie.
 */
export function resolveAfterMove(
  board: number[], stores: [number, number], mover: 0 | 1, moveCount: number,
): { board: number[]; stores: [number, number]; next: 0 | 1; over: boolean } {
  const st: [number, number] = [stores[0], stores[1]];
  const next = (1 - mover) as 0 | 1;

  // Majorité absolue atteinte → fin immédiate.
  if (st[mover] > AW_SEEDS / 2) return { board, stores: st, next, over: true };

  // Le prochain joueur ne peut pas jouer : le joueur en place récolte tout ce qui reste.
  if (legalMoves(board, next).length === 0) {
    const b = [...board];
    let rest = 0;
    for (let i = 0; i < AW_PITS; i++) { rest += b[i]; b[i] = 0; }
    st[mover] += rest;
    return { board: b, stores: st, next, over: true };
  }

  // Garde-fou anti-boucle (parties interminables très rares) : on partage le reste.
  if (moveCount > 180) {
    const b = [...board];
    st[0] += sideSum(board, ownPits(0));
    st[1] += sideSum(board, ownPits(1));
    for (let i = 0; i < AW_PITS; i++) b[i] = 0;
    return { board: b, stores: st, next, over: true };
  }

  return { board, stores: st, next, over: false };
}

/* ── IA : négamax borné selon la difficulté. ── */

function evalFor(board: number[], stores: [number, number], player: 0 | 1): number {
  const opp = (1 - player) as 0 | 1;
  const storeDiff = stores[player] - stores[opp];
  const seedDiff = sideSum(board, ownPits(player)) - sideSum(board, ownPits(opp));
  return storeDiff * 10 + seedDiff; // les graines de son côté = capital potentiel
}

function negamax(board: number[], stores: [number, number], player: 0 | 1, depth: number): number {
  const moves = legalMoves(board, player);
  if (depth === 0 || moves.length === 0) return evalFor(board, stores, player);
  let best = -Infinity;
  for (const m of moves) {
    const { board: nb, captured } = applyMove(board, player, m);
    const st: [number, number] = [stores[0], stores[1]];
    st[player] += captured;
    const val = -negamax(nb, st, (1 - player) as 0 | 1, depth - 1);
    if (val > best) best = val;
  }
  return best;
}

/** Choisit le trou à jouer pour l'IA selon la difficulté. */
export function aiChoose(
  board: number[], stores: [number, number], player: 0 | 1,
  difficulty: "facile" | "moyen" | "difficile", rnd: () => number = Math.random,
): number | null {
  const moves = legalMoves(board, player);
  if (moves.length === 0) return null;
  if (difficulty === "facile") {
    // surtout aléatoire, mais prend une capture évidente une fois sur deux
    if (rnd() < 0.5) {
      const caps = moves.map(m => ({ m, c: applyMove(board, player, m).captured })).filter(x => x.c > 0);
      if (caps.length) return caps.sort((a, b) => b.c - a.c)[0].m;
    }
    return moves[Math.floor(rnd() * moves.length)];
  }
  const depth = difficulty === "difficile" ? 6 : 3;
  let best = moves[0]; let bestVal = -Infinity;
  for (const m of moves) {
    const { board: nb, captured } = applyMove(board, player, m);
    const st: [number, number] = [stores[0], stores[1]];
    st[player] += captured;
    const val = -negamax(nb, st, (1 - player) as 0 | 1, depth - 1);
    if (val > bestVal || (val === bestVal && rnd() < 0.35)) { bestVal = val; best = m; }
  }
  return best;
}
