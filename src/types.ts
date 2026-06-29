export type Screen = "home" | "pick" | "setup" | "lobby" | "game" | "result";
export type GameId = "scrabble" | "chess" | "checkers" | "connect4" | "quiz" | "defi" | "justeprix" | "dessin" | "chronovore";

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
  // Connect4 / Checkers / Chess
  board?: any[][];
  currentTurn?: number;
  selected?: [number, number] | null;
  hints?: [number, number][];
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
