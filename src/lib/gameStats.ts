/* ══════════════════════════════════════════════════════════════════════════
   STATISTIQUES DE JEU (locales) — temps de jeu cumulé par jeu, pour remonter
   les jeux les plus joués en tête de la ludothèque. Stocké dans localStorage
   (par appareil, aucune donnée envoyée ailleurs).
   ══════════════════════════════════════════════════════════════════════════ */
import type { GameId } from "../types";

const KEY = "khelij_gamestats";
const MIN_SESSION = 4;     // on ignore les passages < 4 s (ouverture par erreur)
const MIN_TOTAL = 20;      // un jeu apparaît dans « les plus joués » à partir de 20 s

export interface GameStat { secs: number; plays: number; last: number; }
type StatsMap = Record<string, GameStat>;

function read(): StatsMap {
  try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; }
}
function write(m: StatsMap) {
  try { localStorage.setItem(KEY, JSON.stringify(m)); } catch { /* ignore */ }
}

/** Ajoute une durée de jeu (en secondes) au compteur d'un jeu. */
export function recordPlay(game: GameId, seconds: number, now: number) {
  if (!game || !isFinite(seconds) || seconds < MIN_SESSION) return;
  const m = read();
  const s = m[game] || { secs: 0, plays: 0, last: 0 };
  s.secs = Math.round(s.secs + seconds);
  s.plays += 1;
  s.last = now;
  m[game] = s;
  write(m);
}

export function getStats(): StatsMap { return read(); }

/** Jeux triés par temps de jeu décroissant (au-dessus du seuil), max `n`. */
export function topPlayedGames(n = 4): { game: GameId; stat: GameStat }[] {
  const m = read();
  return Object.entries(m)
    .filter(([, s]) => s.secs >= MIN_TOTAL)
    .sort((a, b) => b[1].secs - a[1].secs || b[1].last - a[1].last)
    .slice(0, n)
    .map(([game, stat]) => ({ game: game as GameId, stat }));
}

/** Durée lisible : « 3 min », « 1 h 20 », « 45 s ». */
export function formatPlaytime(secs: number): string {
  if (secs < 60) return `${Math.round(secs)} s`;
  const min = Math.round(secs / 60);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60), r = min % 60;
  return r ? `${h} h ${r < 10 ? "0" : ""}${r}` : `${h} h`;
}
