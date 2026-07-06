import type { GameId } from "../types";

/** Mode « Soirée famille » : on enchaîne plusieurs jeux rapides et on cumule des
 *  points selon le classement de chaque manche → un grand vainqueur à la fin. */

/* Jeux party rapides (2–4 joueurs, se terminent sur l'écran de résultats). */
export const PARTY_POOL: GameId[] = ["quiz", "petitbac", "quidenous", "bombe", "justeprix", "defi", "imposteur"];

/* Nombre minimum de joueurs par jeu du pool. */
export const PARTY_MIN: Partial<Record<GameId, number>> = {
  quiz: 2, petitbac: 2, quidenous: 3, bombe: 2, justeprix: 2, defi: 2, imposteur: 3,
};

/* Points de soirée attribués selon le rang de la manche (1er → 4e). */
export const PARTY_POINTS = [10, 6, 3, 1];

/** Points de soirée gagnés par chaque joueur pour une manche, d'après ses
 *  scores de jeu (classement décroissant ; les rangs > 4 rapportent 0). */
export function rankPoints(scores: Record<string, number>, playerIds: string[]): Record<string, number> {
  const ordered = [...playerIds].sort((a, b) => (scores[b] || 0) - (scores[a] || 0));
  const pts: Record<string, number> = {};
  ordered.forEach((id, i) => { pts[id] = PARTY_POINTS[i] ?? 0; });
  return pts;
}

/** Additionne les points de la manche courante au cumul de la soirée. */
export function accumulate(party: Record<string, number>, gained: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = { ...party };
  Object.entries(gained).forEach(([id, p]) => { out[id] = (out[id] || 0) + p; });
  return out;
}

/** Choisit le prochain jeu de la soirée : dans le pool, jouable par le nombre de
 *  joueurs, différent du précédent si possible. `rnd` ∈ [0,1). */
export function pickNextPartyGame(playerCount: number, exclude: GameId | null, rnd: number): GameId {
  const eligible = PARTY_POOL.filter(g => (PARTY_MIN[g] ?? 2) <= playerCount);
  const pool = eligible.filter(g => g !== exclude);
  const from = pool.length > 0 ? pool : eligible.length > 0 ? eligible : PARTY_POOL;
  return from[Math.floor(rnd * from.length)] ?? from[0];
}

/** Un jeu peut-il lancer/poursuivre une soirée ? (assez de joueurs, dans le pool) */
export function canParty(game: GameId, playerCount: number): boolean {
  return PARTY_POOL.includes(game) && playerCount >= 2 &&
    PARTY_POOL.some(g => (PARTY_MIN[g] ?? 2) <= playerCount);
}
