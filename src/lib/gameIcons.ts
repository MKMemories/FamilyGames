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
import imposteur from "../assets/icons/imposteur.webp";
import blokus from "../assets/icons/blokus.webp";
import chess from "../assets/icons/chess.webp";
import checkers from "../assets/icons/checkers.webp";
import connect4 from "../assets/icons/connect4.webp";
import bataille from "../assets/icons/bataille.webp";
import morpion from "../assets/icons/morpion.webp";
import awale from "../assets/icons/awale.webp";

export const GAME_ICONS: Partial<Record<GameId, string>> = {
  uno,
  quiz,
  marque,
  petitbac,
  bombe,
  des,
  dessin,
  grandscrabble,
  imposteur,
  blokus,
  chess,
  checkers,
  connect4,
  bataille,
  morpion,
  awale,
};

export function gameIcon(id: GameId): string | undefined {
  return GAME_ICONS[id];
}
