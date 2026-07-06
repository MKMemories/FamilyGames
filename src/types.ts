export type Screen = "home" | "pick" | "setup" | "lobby" | "game" | "result";
export type Difficulty = "facile" | "moyen" | "difficile";
export type GameId = "scrabble" | "chess" | "checkers" | "connect4" | "quiz" | "defi" | "justeprix" | "dessin" | "chronovore" | "imposteur" | "quidenous" | "bataille" | "morpion" | "petitbac" | "bombe" | "des" | "blokus" | "grandscrabble" | "monopoly";

export interface MemberPreset {
  name: string;
  color: string;
  emoji: string;
}

export interface Game {
  id: GameId;
  name: string;
  emoji: string;
  desc: string;
  min: number;
  max: number;
  color: string;
}

export interface Player {
  id: string;
  name: string;
  color: string;
  emoji: string;
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
  title: string;
  price: number;
  thumbnail: string;
  category: string;
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
  isHost: boolean;
  isSolo: boolean;
  room: Room | null;
}
