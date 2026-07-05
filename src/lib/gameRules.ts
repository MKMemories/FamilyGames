import type { GameId } from "../types";

/** Règles officielles concises — UNIQUEMENT pour les jeux non intuitifs.
 *  Un jeu absent de cette table n'affiche aucun bouton d'aide (interface épurée). */
export interface GameRule { title: string; emoji: string; lines: string[]; }

export const GAME_RULES: Partial<Record<GameId, GameRule>> = {
  des: {
    title: "Bluff des Dés",
    emoji: "🎲",
    lines: [
      "But : être le dernier joueur à garder des dés.",
      "Chacun lance 5 dés, cachés des autres.",
      "À ton tour : monte la mise « il y a au moins X dés montrant la face Y » (tous les dés de la table comptent), OU crie « Menteur ! ».",
      "Monter = plus de dés, ou même nombre avec une face plus haute.",
      "« Menteur » → on révèle tout et on compte la face annoncée. Si le compte atteint la mise, celui qui a douté perd un dé ; sinon c'est le parieur.",
      "À 0 dé, tu es éliminé. Chaque face ne compte qu'elle-même (pas de joker).",
    ],
  },
  blokus: {
    title: "Territoires",
    emoji: "🧩",
    lines: [
      "But : poser le plus de cases de ta couleur.",
      "Ta 1re pièce doit couvrir ton coin de départ.",
      "Ensuite, chaque pièce doit toucher une des tiennes par un COIN (diagonale) — jamais par un côté.",
      "Tes pièces peuvent toucher celles des autres par les côtés, sans problème.",
      "Tu peux tourner et retourner les pièces. Si tu ne peux plus jouer, tu passes.",
      "Fin quand tout le monde a passé : le plus de cases posées gagne.",
    ],
  },
  imposteur: {
    title: "L'Imposteur",
    emoji: "🕵️",
    lines: [
      "Tout le monde reçoit le même mot secret… sauf l'imposteur, qui en a un proche mais différent.",
      "Garde ton mot pour toi et donne un indice subtil, sans le prononcer.",
      "Ensuite, tout le monde vote pour démasquer l'intrus.",
      "Les civils gagnent des points s'ils le trouvent ; l'imposteur marque s'il passe inaperçu.",
    ],
  },
  petitbac: {
    title: "Petit Bac",
    emoji: "🅰️",
    lines: [
      "Une lettre est tirée. Remplis chaque catégorie avec un mot qui commence par cette lettre.",
      "Le premier à finir presse STOP : les autres ont quelques secondes pour terminer.",
      "Réponse valide et unique = 10 pts ; valide mais trouvée par un autre = 5 pts ; vide = 0.",
      "⚡ Le premier à finir gagne un bonus. Jokers : ×2 (double la manche), Temps + (rallonge le décompte).",
    ],
  },
  bombe: {
    title: "Mot Bombe",
    emoji: "💣",
    lines: [
      "Une syllabe apparaît. Celui qui tient la bombe doit taper un mot qui la contient avant l'explosion.",
      "Mot accepté → la bombe passe au joueur suivant avec une nouvelle syllabe.",
      "Si la mèche arrive à zéro dans tes mains, tu perds une vie.",
      "À court de vies, tu es éliminé. Le dernier survivant gagne !",
    ],
  },
};
