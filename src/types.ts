export type Screen = "home" | "pick" | "setup" | "lobby" | "game" | "result";
export type Difficulty = "facile" | "moyen" | "difficile";
export type GameId = "scrabble" | "chess" | "checkers" | "connect4" | "quiz" | "defi" | "justeprix" | "dessin" | "chronovore" | "imposteur" | "quidenous" | "bataille" | "morpion";

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

export interface DrawPath {
  id: string;
  points: DrawPoint[];
  color: string;
  size: number;
  eraser: boolean;
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
  quizOptions?: string[];
  questionIdx?: number;
  revealed?: boolean;
  totalQuestions?: number;
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
