/* Illustrations d'icônes par jeu (remplacent l'emoji du médaillon).
   Optionnel et incrémental : un jeu sans entrée retombe sur son emoji. */
import type { GameId } from "../types";

import uno from "../assets/icons/uno.webp";
import quiz from "../assets/icons/quiz.webp";
import marque from "../assets/icons/marque.webp";
import petitbac from "../assets/icons/petitbac.webp";
import bombe from "../assets/icons/bombe.webp";
import des from "../assets/icons/des.webp";
import dessin from "../assets/icons/dessin.webp";
import grandscrabble from "../assets/icons/grandscrabble.webp";

export const GAME_ICONS: Partial<Record<GameId, string>> = {
  uno,
  quiz,
  marque,
  petitbac,
  bombe,
  des,
  dessin,
  grandscrabble,
};

export function gameIcon(id: GameId): string | undefined {
  return GAME_ICONS[id];
}
