import type { GameId } from "../types";

/** Règles officielles concises — UNIQUEMENT pour les jeux non intuitifs.
 *  Un jeu absent de cette table n'affiche aucun bouton d'aide (interface épurée). */
export interface GameRule { title: string; emoji: string; lines: string[]; }

export const GAME_RULES: Partial<Record<GameId, GameRule>> = {
  bataille: {
    title: "Bataille Navale",
    emoji: "🚢",
    lines: [
      "But : repérer et couler les 5 bateaux de l'adversaire avant qu'il coule les tiens.",
      "1) Placement : pose tes 5 bateaux sur TA grille. Touche une case pour poser le bateau en cours ; le bouton « Orientation » le met horizontal ↔ ou vertical ↕. « Aléatoire » place toute la flotte d'un coup.",
      "2) Quand les deux flottes sont prêtes, le combat démarre.",
      "3) À ton tour, touche une case de la GRILLE ADVERSE (celle du haut) pour y tirer — à l'aveugle, sans voir ses bateaux.",
      "🎯 Rouge = touché · 💧 Bleu = raté. « Touché-coulé ! » quand un bateau entier est atteint.",
      "On tire chacun son tour (même après un touché). Le compteur « Touchés : X/17 » suit ta progression : 17 cases de bateaux à couler en tout.",
      "En bas, « Ta flotte » montre tes bateaux et les tirs que tu subis. Premier à tout couler = victoire !",
    ],
  },
  yams: {
    title: "Yam's",
    emoji: "🎲",
    lines: [
      "But : marquer le plus de points en remplissant ta feuille de score (13 cases).",
      "À ton tour : lance les 5 dés. Tu peux relancer jusqu'à 3 fois en tout.",
      "Entre deux lancers, touche les dés à GARDER (ils se figent 🔒) et relance seulement les autres.",
      "Ensuite, coche UNE case libre : elle prend le score que valent tes dés (score potentiel affiché en vert).",
      "Section haute As→Six : somme des dés de cette valeur. Bonus +35 si tu atteins 63.",
      "Brelan / Carré : 3 ou 4 dés identiques → somme des 5 dés. Full (3+2) = 25.",
      "Petite suite (4 qui se suivent) = 30 · Grande suite (5) = 40 · Yam's (5 identiques) = 50 · Chance = somme des dés.",
      "Chaque case ne se coche qu'une fois. Si rien ne marque, sacrifie une case à 0. Plus haut total gagne.",
    ],
  },
  awale: {
    title: "Awalé",
    emoji: "🫘",
    lines: [
      "But : récolter le plus de graines. La rangée du bas est TON camp.",
      "À ton tour : touche un de tes trous non vide. On prend toutes ses graines et on les sème une par une dans les trous suivants (sens anti-horaire).",
      "Capture : si ta dernière graine tombe dans un trou ADVERSE qui contient alors 2 ou 3 graines, tu les gagnes.",
      "La capture remonte : le trou précédent (toujours chez l'adversaire) est aussi récolté s'il a 2 ou 3, et ainsi de suite.",
      "Si l'adversaire n'a plus aucune graine, tu dois jouer un coup qui lui en redonne.",
      "Fin quand un joueur ne peut plus jouer : le plus de graines dans son grenier gagne.",
    ],
  },
  motmystere: {
    title: "Le Mot Mystère",
    emoji: "🔡",
    lines: [
      "But : deviner le mot caché de 5 lettres en 6 essais maximum.",
      "Tape un mot de 5 lettres au clavier, puis valide avec ⏎.",
      "Les couleurs t'aident : 🟩 vert = bonne lettre, bien placée · 🟨 jaune = lettre présente mais mal placée · ⬜ gris = lettre absente du mot.",
      "Le clavier se colore aussi pour te rappeler les lettres déjà essayées.",
      "Tout le monde a le MÊME mot : c'est une course ! Trouve-le en peu d'essais et vite pour marquer plus.",
      "Plusieurs manches ; le plus de points au total gagne.",
    ],
  },
  quidenous: {
    title: "Qui de nous… ?",
    emoji: "🙋",
    lines: [
      "Une question rigolote s'affiche (« Qui est le plus… ? »).",
      "Chacun vote EN SECRET pour la personne du groupe qui correspond le mieux.",
      "Quand tout le monde a voté, on révèle les votes tous ensemble : fous rires garantis !",
      "La personne la plus votée est « élue » pour cette question.",
      "On enchaîne plusieurs questions. C'est un jeu d'ambiance — l'important, c'est de rigoler !",
    ],
  },
  grandscrabble: {
    title: "Grand Scrabble",
    emoji: "🔠",
    lines: [
      "But : marquer le plus de points en formant des mots sur le plateau 15×15.",
      "À ton tour : pose des lettres de ton chevalet pour écrire un mot (en ligne ou en colonne).",
      "Le tout premier mot doit passer par la case centrale ★. Ensuite, chaque nouveau mot doit toucher un mot déjà posé.",
      "Cases bonus : elles doublent/triplent la lettre, ou le mot entier.",
      "Chaque lettre a une valeur (indiquée sur la tuile). Après avoir joué, tu repioches pour revenir à 7 lettres.",
      "Les 2 tuiles blanches remplacent n'importe quelle lettre (0 point). Tu peux passer ton tour.",
      "Fin quand la pioche est vide ou que tout le monde passe : plus haut score gagne.",
    ],
  },
  sudoku: {
    title: "Sudoku",
    emoji: "🔢",
    lines: [
      "But : remplir la grille 9×9 avec les chiffres de 1 à 9.",
      "Règle d'or : chaque chiffre apparaît UNE seule fois par ligne, par colonne, et dans chaque bloc de 3×3.",
      "Touche une case vide, puis un chiffre du pavé pour la remplir. Les chiffres en gras sont donnés au départ (non modifiables).",
      "Un chiffre en rouge signale un conflit (déjà présent sur la ligne/colonne/bloc).",
      "« Notes » ✏️ : crayonne plusieurs petits chiffres dans une case pour t'aider. « Indice » 💡 dévoile la case sélectionnée.",
      "Chaque grille a une solution unique. Le chrono et le compteur de fautes suivent ta performance.",
    ],
  },
  motsfleches: {
    title: "Mots Fléchés",
    emoji: "➡️",
    lines: [
      "But : remplir toute la grille à partir des définitions.",
      "Les cases foncées contiennent une définition et une flèche : ▶ = le mot part vers la droite, ▼ = vers le bas.",
      "Touche une case fléchée (ou une lettre) : la définition s'affiche en grand en haut, et le mot se surligne.",
      "Tape les lettres au clavier : le curseur avance tout seul dans le mot.",
      "Touche une lettre déjà partagée par deux mots pour basculer de l'un à l'autre (les mots se croisent).",
      "« Vérifier » ✅ marque les lettres fausses en rouge · « Révéler » 💡 complète le mot sélectionné.",
    ],
  },
  tetris: {
    title: "Tetris",
    emoji: "🧱",
    lines: [
      "But : compléter des lignes horizontales pleines pour les faire disparaître, et durer le plus longtemps.",
      "Les pièces tombent. Déplace-les ◀ ▶, tourne-les ⟳, accélère la descente ▼.",
      "⤓ = chute instantanée (hard drop). La pièce fantôme montre où elle va atterrir.",
      "HOLD met une pièce de côté pour la ressortir plus tard (une fois par pièce).",
      "Compléter 4 lignes d'un coup = un TETRIS (gros bonus de points).",
      "Tous les 10 lignes, le niveau monte et les pièces tombent plus vite. Fin quand la pile atteint le haut.",
      "Clavier : ← → déplacer · ↑/X tourner · ↓ descendre · Espace chute · Maj/C réserve · P pause.",
    ],
  },
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
