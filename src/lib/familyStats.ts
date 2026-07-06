/* ══════════════════════════════════════════════════════════════════════════
   PALMARÈS FAMILLE — suivi persistant des résultats (local, par appareil).
   À chaque fin de partie on enregistre : parties jouées, victoires, points
   cumulés, meilleur score, séries de victoires, jeux joués, badges débloqués.
   Sert au classement complet et au « Hall of Fame » de la famille.
   ══════════════════════════════════════════════════════════════════════════ */
import type { GameId } from "../types";

const KEY = "khelij_palmares";
const AI = "Ordinateur";

export interface PerGame { games: number; wins: number; points: number; best: number; }
export interface PStat {
  name: string;
  games: number;
  wins: number;
  points: number;
  best: number;          // meilleur score en une seule partie
  streak: number;        // série de victoires en cours
  bestStreak: number;
  perGame: Record<string, PerGame>;
  achievements: string[];
  updated: number;
}
type Store = Record<string, PStat>;

function read(): Store { try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; } }
function write(s: Store) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ignore */ } }

function blank(name: string): PStat {
  return { name, games: 0, wins: 0, points: 0, best: 0, streak: 0, bestStreak: 0, perGame: {}, achievements: [], updated: 0 };
}

/* ── Badges (originaux) ── */
export interface Achievement { id: string; emoji: string; label: string; desc: string; test: (s: PStat) => boolean; }
export const ACHIEVEMENTS: Achievement[] = [
  { id: "first_win", emoji: "🥇", label: "Première victoire", desc: "Gagner une partie", test: s => s.wins >= 1 },
  { id: "hat_trick", emoji: "🎩", label: "Coup du chapeau", desc: "3 victoires d'affilée", test: s => s.bestStreak >= 3 },
  { id: "on_fire", emoji: "🔥", label: "En feu", desc: "5 victoires d'affilée", test: s => s.bestStreak >= 5 },
  { id: "champion", emoji: "🏆", label: "Champion", desc: "10 victoires au total", test: s => s.wins >= 10 },
  { id: "legend", emoji: "👑", label: "Légende", desc: "25 victoires au total", test: s => s.wins >= 25 },
  { id: "veteran", emoji: "🎖️", label: "Vétéran", desc: "30 parties jouées", test: s => s.games >= 30 },
  { id: "high_scorer", emoji: "💯", label: "Gros score", desc: "Marquer 100 points en une partie", test: s => s.best >= 100 },
  { id: "centurion", emoji: "💎", label: "Trésor", desc: "1000 points cumulés", test: s => s.points >= 1000 },
  { id: "explorer", emoji: "🧭", label: "Explorateur", desc: "Jouer à 8 jeux différents", test: s => Object.keys(s.perGame).length >= 8 },
  { id: "collector", emoji: "🌈", label: "Collectionneur", desc: "Jouer à 15 jeux différents", test: s => Object.keys(s.perGame).length >= 15 },
];

export interface ResultEntry { name: string; score: number; win: boolean; }

/** Enregistre le résultat d'une partie (une entrée par joueur humain). */
export function recordResult(game: GameId, entries: ResultEntry[]) {
  if (!entries || entries.length === 0) return;
  const store = read();
  for (const e of entries) {
    if (!e.name || e.name === AI) continue;
    const s = store[e.name] || blank(e.name);
    s.games += 1;
    s.points += Math.max(0, Math.round(e.score || 0));
    s.best = Math.max(s.best, Math.round(e.score || 0));
    if (e.win) { s.wins += 1; s.streak += 1; s.bestStreak = Math.max(s.bestStreak, s.streak); }
    else { s.streak = 0; }
    const pg = s.perGame[game] || { games: 0, wins: 0, points: 0, best: 0 };
    pg.games += 1; pg.points += Math.max(0, Math.round(e.score || 0));
    pg.best = Math.max(pg.best, Math.round(e.score || 0));
    if (e.win) pg.wins += 1;
    s.perGame[game] = pg;
    // badges
    for (const a of ACHIEVEMENTS) if (!s.achievements.includes(a.id) && a.test(s)) s.achievements.push(a.id);
    s.updated = entries.length; // marqueur non-nul (pas de Date.now ici pour rester déterministe)
    store[e.name] = s;
  }
  write(store);
}

export function getStore(): Store { return read(); }

/** Classement complet : victoires puis points puis parties. */
export function getRanking(): PStat[] {
  return Object.values(read()).sort((a, b) => b.wins - a.wins || b.points - a.points || b.games - a.games);
}

export interface Records { topScore?: { name: string; value: number; game: string }; longestStreak?: { name: string; value: number }; mostWins?: { name: string; value: number }; totalGames: number; }
export function getRecords(): Records {
  const all = Object.values(read());
  const r: Records = { totalGames: all.reduce((n, s) => n + s.games, 0) };
  for (const s of all) {
    // meilleur score : cherche le jeu où le best a été réalisé
    let bestGame = "";
    for (const [g, pg] of Object.entries(s.perGame)) if (pg.best === s.best) bestGame = g;
    if (!r.topScore || s.best > r.topScore.value) r.topScore = { name: s.name, value: s.best, game: bestGame };
    if (!r.longestStreak || s.bestStreak > r.longestStreak.value) r.longestStreak = { name: s.name, value: s.bestStreak };
    if (!r.mostWins || s.wins > r.mostWins.value) r.mostWins = { name: s.name, value: s.wins };
  }
  return r;
}

export function resetPalmares() { try { localStorage.removeItem(KEY); } catch { /* ignore */ } }
