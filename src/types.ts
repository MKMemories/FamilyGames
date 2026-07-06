export type Screen = "home" | "pick" | "setup" | "lobby" | "game" | "result" | "palmares";
export type Difficulty = "facile" | "moyen" | "difficile";
export type GameId = "scrabble" | "chess" | "checkers" | "connect4" | "quiz" | "defi" | "justeprix" | "dessin" | "chronovore" | "imposteur" | "quidenous" | "bataille" | "morpion" | "petitbac" | "bombe" | "des" | "blokus" | "grandscrabble" | "monopoly" | "uno" | "marque" | "memory" | "motmystere" | "yams" | "awale";

export interface MemberPreset {
  name: string;
  color: string;
  emoji: string;
}

export type GameCat = "famille" | "duo" | "solo";

export interface Game {
  id: GameId;
  name: string;
  emoji: string;
  desc: string;
  min: number;
  max: number;
  color: string;
  grad: string;        // 2e teinte du dégradé du médaillon
  cat: GameCat;        // rubrique de la ludothèque
  star?: boolean;      // pépite mise en avant (soirée famille)
}

export interface Player {
  id: string;
  name: string;
  color: string;
  emoji: string;
  avatar?: string;   // avatar personnalisé encodé (voir lib/avatar)
}

export interface StoredQuizQuestion {
  question: string;
  answer: string;
  badAnswers: string[];
  category: string;
}

/* ── Le Juste Prix ───────────────────────── */
export interface JpProduct {
  id: number;
  title: string;         // inclut la quantité/poids pour les fruits & légumes
  price: number;
  thumbnail: string;
  category: string;
  emoji?: string;        // visuel (aucune image externe requise)
  source?: string;       // source du prix (ex. « FranceAgriMer 2024 »)
  country?: string;      // pays où le prix s'applique (ex. « France »)
}

/* ── Devine la Marque ────────────────────── */
export interface Brand {
  id: number;
  name: string;
  initial: string;       // monogramme (vide → 1re lettre)
  c1: string;            // couleur signature 1
  c2: string;            // couleur signature 2
  emoji: string;         // emoji de secteur (indice)
  category: string;
  hint: string;          // indice textuel (dévoilé progressivement)
}

/* ── Quiz KHELIJ « Le Grand Mix » (formats mélangés par manche) ── */
export interface MixRound {
  type: "qcm" | "vf" | "prix" | "marque";
  cat: string;           // libellé du format (avec emoji)
  q?: string;            // énoncé (qcm / vf)
  sub?: string;          // sous-catégorie (qcm)
  options?: string[];    // qcm / vf / marque
  answer?: string;       // bonne réponse (qcm / vf / marque)
  explain?: string;      // anecdote (vf)
  brand?: Brand;         // marque (illustration + indices)
  product?: JpProduct;   // produit (juste prix)
}

/* ── Dessinez, c'est gagné ───────────────── */
export interface DrawPoint { x: number; y: number; }

export type DrawTool = "pen" | "marker" | "line" | "rect" | "ellipse" | "arrow" | "eraser";

export interface DrawPath {
  id: string;
  points: DrawPoint[];      // pen/marker/eraser: full trail ; shapes: [start, end]
  color: string;
  size: number;             // effective line width (already includes tool scaling)
  eraser: boolean;          // legacy flag, kept in sync with tool === "eraser"
  tool?: DrawTool;
  opacity?: number;         // marker / highlighter blending
  fill?: boolean;           // filled rectangle / ellipse
}

export interface DessinGuessEntry {
  playerId: string;
  playerName: string;
  text: string;
  correct: boolean;
  ts: number;
}

/* ── Room ────────────────────────────────── */
export interface Room {
  id: string;
  game: GameId;
  status: "lobby" | "playing" | "finished";
  hostId: string;
  players: Record<string, Player>;
  scores: Record<string, number>;
  winner?: string;
  createdAt: number;
  // Solo vs computer
  aiId?: string;                                   // playerId of the computer (present ⇒ solo-vs-AI)
  soloDifficulty?: "facile" | "moyen" | "difficile";
  // Connect4 / Checkers / Chess
  board?: any[][];
  currentTurn?: number;
  selected?: [number, number] | null;
  hints?: [number, number][];
  // Chess (full rules)
  chessCastle?: string;            // castling rights, e.g. "KQkq" ("" if none)
  chessEp?: string | null;         // en-passant target square "r,c" or null
  chessCheck?: [number, number] | null; // king square in check (for highlight)
  // Checkers (mandatory capture + multi-jump)
  chkChain?: [number, number] | null;   // piece that must keep jumping this turn
  // Scrabble
  bag?: string[];
  racks?: Record<string, string[]>;
  roundWord?: string;
  selectedTiles?: number[];
  wordHistory?: { player: string; word: string; pts: number }[];
  passedTurn?: Record<string, boolean>;
  // Quiz
  quizThemes?: string[] | null;
  quizQuestions?: StoredQuizQuestion[] | null;
  quizAnswers?: Record<string, string>;
  quizTimes?: Record<string, number>;            // ms timestamp of each answer (speed bonus)
  quizOptions?: string[];
  questionIdx?: number;
  revealed?: boolean;
  totalQuestions?: number;
  // Quiz « Le Grand Mix » : playlist de manches de formats variés
  mixRounds?: MixRound[] | null;
  mixIdx?: number;
  mixAnswers?: Record<string, string>;
  mixTimes?: Record<string, number>;
  mixRevealed?: boolean;
  // Memory des Paires
  mmCards?: string[] | null;        // emoji par case
  mmMatched?: number[];             // cases appariées
  mmUp?: number[];                  // cases retournées ce tour (0-2)
  mmTurn?: number;                  // index dans mmOrder
  mmOrder?: string[];
  mmPairs?: Record<string, number>; // paires trouvées par joueur
  // Le Mot Mystère (course : même mot pour tous, chacun devine de son côté)
  wmWord?: string | null;           // solution de la manche (5 lettres)
  wmRound?: number;
  wmTotalRounds?: number;
  wmGuesses?: Record<string, string[]>; // essais par joueur
  wmDone?: Record<string, boolean>;     // joueur a terminé (trouvé ou 6 essais)
  wmSolved?: Record<string, number>;    // nb d'essais utilisés si trouvé
  wmTimes?: Record<string, number>;     // horodatage de résolution (ordre/vitesse)
  wmRevealed?: boolean;                 // manche dévoilée
  wmUsed?: number[];                    // mots déjà tirés (non-répétition)
  // Yam's (5 dés, feuille de score)
  ymOrder?: string[];                   // ordre de jeu
  ymTurn?: number;                      // index dans ymOrder
  ymDice?: number[] | null;             // 5 dés (null tant qu'aucun lancer)
  ymHeld?: boolean[];                   // dés conservés entre les lancers
  ymRolls?: number;                     // lancers utilisés ce tour (0-3)
  ymScores?: Record<string, Record<string, number>>; // ymScores/<pid>/<catId>
  // Awalé (Oware, 2 joueurs, semailles)
  awBoard?: number[];                   // 12 trous
  awStores?: number[];                  // greniers [siège0, siège1]
  awTurn?: 0 | 1;                       // siège dont c'est le tour
  awOrder?: string[];                   // [idSiège0, idSiège1]
  awMoves?: number;                     // compteur de coups (clé IA + garde-fou)
  awLast?: number | null;              // dernier trou joué (surbrillance)
  awGain?: number;                      // dernière capture (feedback)
  // Jokers (shared across round-based games)
  jokers?: Record<string, Record<string, number>>;  // jokers/<pid>/<type> = remaining count
  jokerActive?: Record<string, string>;              // jokerActive/<pid> = type active this round
  // Grand Scrabble (plateau 15×15)
  gsPhase?: "play" | "over" | null;
  gsBoard?: (0 | { l: string; blank?: boolean })[][]; // 0 = case vide
  gsRacks?: Record<string, string[]>;
  gsBag?: string[];
  gsOrder?: string[];
  gsTurn?: number;                                    // index dans gsOrder
  gsHistory?: { player: string; word: string; pts: number }[];
  gsPasses?: number;                                  // passes/échanges consécutifs
  gsLastCells?: [number, number][];
  // Monopoly (état complet du moteur, cf. monopolyEngine)
  mono?: any;
  // UNO (état complet du moteur, cf. unoEngine)
  uno?: any;
  // Mode Soirée famille (enchaînement de jeux, score cumulé)
  partyMode?: boolean;
  partyScores?: Record<string, number>;              // cumul de points de soirée
  partyIndex?: number;                               // nombre de jeux déjà joués
  partyFinished?: boolean;                           // grand final atteint
  // Defi
  defiIdx?: number;
  defiDeck?: number[];
  timerLeft?: number;
  timerRunning?: boolean;
  // Le Juste Prix
  jpRound?: number;
  jpTotalRounds?: number;
  jpProduct?: JpProduct | null;
  jpAnswers?: Record<string, number>;
  jpTimes?: Record<string, number>;              // submit timestamp (speed bonus)
  jpRevealed?: boolean;
  jpUsed?: number[];                             // produits déjà tirés dans la partie (non-répétition)
  /* ── Devine la Marque ── */
  mkRound?: number;
  mkTotalRounds?: number;
  mkBrand?: Brand | null;
  mkOptions?: string[];
  mkAnswers?: Record<string, string>;
  mkTimes?: Record<string, number>;
  mkRevealed?: boolean;
  mkUsed?: number[];
  // Dessinez, c'est gagné
  dessinManche?: number;
  dessinTotalManches?: number;
  dessinMot?: string | null;
  dessinDessinateur?: string | null;
  dessinPaths?: DrawPath[];
  dessinGuessedBy?: Record<string, boolean>;
  dessinCorrectGuesser?: string | null;
  dessinRoundActive?: boolean;
  dessinGuessChat?: DessinGuessEntry[];
  // L'Imposteur
  impPhase?: "reveal" | "vote" | "result" | null;
  impRound?: number;
  impImposterId?: string;
  impWordCivil?: string;
  impWordImposter?: string;
  impSeen?: Record<string, boolean>;
  impVotes?: Record<string, string>;
  // Qui de nous… ?
  qdnPhase?: "vote" | "reveal" | null;
  qdnRound?: number;
  qdnTotalRounds?: number;
  qdnQuestion?: string;
  qdnUsed?: number[];
  qdnVotes?: Record<string, string>;
  // Bataille Navale
  bnPhase?: "place" | "battle" | "over";
  bnGrids?: Record<string, number[][]>;
  bnReady?: Record<string, boolean>;
  bnShots?: Record<string, Record<string, "hit" | "miss">>;
  bnTurn?: string;
  bnWinner?: string;
  // Morpion
  mpCells?: string[];
  mpTurn?: string;
  mpWinner?: string;
  mpLine?: number[];
  // Petit Bac
  pbPhase?: "fill" | "reveal" | null;
  pbRound?: number;
  pbTotalRounds?: number;
  pbLetter?: string;
  pbCategories?: string[];
  pbAnswers?: Record<string, Record<string, string>>;   // pbAnswers/<pid>/<catIdx>
  pbDone?: Record<string, boolean>;                      // pbDone/<pid>
  pbUsedLetters?: string[];
  pbStopBy?: string | null;                              // who pressed STOP first
  pbStopAt?: number | null;                              // ms deadline once STOP pressed
  // La Bombe (mot chaud)
  bmbPhase?: "play" | "over" | null;
  bmbSyllable?: string;
  bmbHolder?: string;                                    // playerId whose turn it is
  bmbLives?: Record<string, number>;
  bmbUsedWords?: string[];
  bmbUsedSyllables?: string[];
  bmbRoundId?: number;                                   // bumps each pass → resets fuse
  bmbOrder?: string[];                                   // active turn order
  bmbLastWord?: string;
  bmbLastBy?: string;
  bmbFuseMs?: number;                                    // fuse duration for the current holder
  // Bluff des Dés
  dsPhase?: "bid" | "reveal" | "over" | null;
  dsDice?: Record<string, number[]>;                    // hidden per player, revealed on challenge
  dsCounts?: Record<string, number>;                    // dice remaining
  dsBid?: { qty: number; face: number; by: string } | null;
  dsTurn?: string;
  dsOrder?: string[];
  dsReveal?: { face: number; qty: number; actual: number; loser: string; bidder: string; caller: string } | null;
  dsRoundId?: number;
  // Territoires (Blokus-like)
  blkBoard?: number[][] | null;                         // 0 empty, else playerIndex+1
  blkTurn?: number;                                     // index into blkOrder
  blkOrder?: string[];
  blkRemaining?: Record<string, number[]>;              // piece ids still in hand
  blkPassed?: Record<string, boolean>;
  blkLastCells?: [number, number][];
  blkSize?: number;
}

export interface AppState {
  screen: Screen;
  game: GameId | null;
  roomId: string | null;
  playerId: string | null;
  playerName: string | null;
  playerColor: string | null;
  playerAvatar: string | null;
  isHost: boolean;
  isSolo: boolean;
  room: Room | null;
}
