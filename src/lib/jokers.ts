/** Jokers partagés + bonus de vitesse, réutilisés par les jeux à manches
 *  (Quiz, Petit Bac, Défi, Juste Prix). Chaque joueur dispose d'un petit stock
 *  de jokers à usage unique pour toute la partie. */

export type JokerType = "fifty" | "double" | "timeplus" | "skip";

export interface JokerDef {
  type: JokerType;
  emoji: string;
  label: string;
  desc: string;
}

export const JOKER_DEFS: Record<JokerType, JokerDef> = {
  fifty:    { type: "fifty",    emoji: "➗",  label: "50/50",   desc: "Élimine deux mauvaises réponses" },
  double:   { type: "double",   emoji: "×2",  label: "Double",  desc: "Double tes points de la manche" },
  timeplus: { type: "timeplus", emoji: "⏱️", label: "Temps +", desc: "Ajoute du temps au chrono" },
  skip:     { type: "skip",     emoji: "⏭️", label: "Passer",  desc: "Passe la manche sans perdre de points" },
};

/** Stock initial : 1 exemplaire de chaque type fourni, pour chaque joueur. */
export function initJokers(playerIds: string[], types: JokerType[]): Record<string, Record<string, number>> {
  const inv: Record<string, Record<string, number>> = {};
  playerIds.forEach((id) => {
    inv[id] = {};
    types.forEach((t) => { inv[id][t] = 1; });
  });
  return inv;
}

/** Nombre de jokers d'un type restant à un joueur. */
export function jokerCount(
  jokers: Record<string, Record<string, number>> | undefined,
  pid: string,
  type: JokerType,
): number {
  return jokers?.[pid]?.[type] ?? 0;
}

/** Bonus de vitesse dégressif selon le rang (0 = le plus rapide). */
export function speedBonus(rank: number): number {
  return rank === 0 ? 3 : rank === 1 ? 2 : rank === 2 ? 1 : 0;
}

export const SPEED_BONUS_LABEL = "⚡ +3 / +2 / +1 aux plus rapides";
