/* Illustrations d'icônes par jeu (remplacent l'emoji du médaillon).
   Optionnel et incrémental : un jeu sans entrée retombe sur son emoji. */
import type { GameId } from "../types";

import uno from "../assets/icons/uno.webp";
import monopoly from "../assets/icons/monopoly.webp";
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
import justeprix from "../assets/icons/justeprix.webp";
import defi from "../assets/icons/defi.webp";
import yams from "../assets/icons/yams.webp";
import scrabble from "../assets/icons/scrabble.webp";
import memory from "../assets/icons/memory.webp";
import motmystere from "../assets/icons/motmystere.webp";
import quidenous from "../assets/icons/quidenous.webp";
import sudoku from "../assets/icons/sudoku.webp";
import motsfleches from "../assets/icons/motsfleches.webp";
import tetris from "../assets/icons/tetris.webp";

export const GAME_ICONS: Partial<Record<GameId, string>> = {
  uno,
  monopoly,
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
  justeprix,
  defi,
  yams,
  scrabble,
  memory,
  motmystere,
  quidenous,
  sudoku,
  motsfleches,
  tetris,
};

export function gameIcon(id: GameId): string | undefined {
  return GAME_ICONS[id];
}
