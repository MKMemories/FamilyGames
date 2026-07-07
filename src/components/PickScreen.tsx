import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { GAMES, GAME_SECTIONS } from "../lib/gameData";
import { gameIcon } from "../lib/gameIcons";
import { topPlayedGames, formatPlaytime } from "../lib/gameStats";
import type { Game, GameId } from "../types";

interface PickScreenProps {
  onSelect: (game: GameId) => void;
  onBack: () => void;
}

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04, delayChildren: 0.04 } },
};
const item = {
  hidden: { opacity: 0, y: 20, scale: 0.94 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring" as const, stiffness: 400, damping: 27 } },
};

function playersLabel(min: number, max: number): string {
  return min === max ? `${min}` : `${min}–${max}`;
}

function GameCard({ g, badge, onSelect }: { g: Game; badge?: string; onSelect: (id: GameId) => void }) {
  return (
    <motion.button
      className={`game-card ${g.star ? "star" : ""}`}
      style={{ "--gc": g.color, "--gc2": g.grad } as React.CSSProperties}
      variants={item}
      whileHover={{ y: -6 }}
      whileTap={{ scale: 0.95 }}
      onClick={() => onSelect(g.id)}
    >
      {badge ? <span className="game-playtime">⏱ {badge}</span> : g.star && <span className="game-ribbon">★ Soirée</span>}
      <span className={`game-medallion ${gameIcon(g.id) ? "has-img" : ""}`}>
        {gameIcon(g.id)
          ? <img className="game-medal-img" src={gameIcon(g.id)} alt="" loading="lazy" />
          : <span className="game-emoji">{g.emoji}</span>}
        <span className="game-sheen" aria-hidden />
      </span>
      <span className="game-name">{g.name}</span>
      <span className="game-desc">{g.desc}</span>
      <span className="game-players">
        <span className="gp-people">{g.max === 1 ? "🧑" : g.max >= 4 ? "👨‍👩‍👧‍👦" : "👥"}</span>
        {playersLabel(g.min, g.max)} joueur{g.max > 1 ? "s" : ""}
      </span>
    </motion.button>
  );
}

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function PickScreen({ onSelect, onBack }: PickScreenProps) {
  const [query, setQuery] = useState("");
  const q = norm(query.trim());

  // Jeux les plus joués (temps de jeu cumulé, local) → remontés en tête.
  const top = useMemo(() => {
    return topPlayedGames(4)
      .map(({ game, stat }) => ({ g: GAMES.find(x => x.id === game), secs: stat.secs }))
      .filter((x): x is { g: Game; secs: number } => !!x.g);
  }, []);

  const results = useMemo(
    () => (q ? GAMES.filter(g => norm(g.name).includes(q) || norm(g.desc).includes(q)) : []),
    [q],
  );

  return (
    <div className="screen pick-screen">
      <div className="pick-aurora" aria-hidden />
      <div className="screen-header pick-header">
        <button className="btn-back" onClick={onBack}>←</button>
        <div className="pick-title">
          <h2>Ludothèque</h2>
          <span className="pick-sub">{GAMES.length} jeux · choisis ta partie</span>
        </div>
        <div style={{ width: 40 }} />
      </div>

      {/* 🔍 Recherche */}
      <div className="pick-search">
        <span className="pick-search-ico" aria-hidden>🔍</span>
        <input
          className="pick-search-input"
          type="text"
          inputMode="search"
          placeholder="Rechercher un jeu…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          aria-label="Rechercher un jeu"
        />
        {query && <button className="pick-search-clear" onClick={() => setQuery("")} aria-label="Effacer">✕</button>}
      </div>

      {q ? (
        <section className="pick-section">
          <motion.div className="section-head" initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 26 }}>
            <span className="section-icon">🔍</span>
            <div className="section-text">
              <span className="section-label">Résultats</span>
              <span className="section-hint">{results.length ? `pour « ${query.trim()} »` : "Aucun jeu ne correspond"}</span>
            </div>
            <span className="section-count">{results.length}</span>
          </motion.div>
          {results.length ? (
            <motion.div className="games-grid" variants={container} initial="hidden" animate="show">
              {results.map(g => <GameCard key={g.id} g={g} onSelect={onSelect} />)}
            </motion.div>
          ) : (
            <div className="pick-empty">😕 Aucun jeu trouvé.<br />Essaie « uno », « dés », « mots »…</div>
          )}
        </section>
      ) : (
      <>

      {/* 🔥 Les plus joués (d'après ton temps de jeu) */}
      {top.length > 0 && (
        <section className="pick-section">
          <motion.div className="section-head" initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 26 }}>
            <span className="section-icon">🔥</span>
            <div className="section-text">
              <span className="section-label">Les plus joués</span>
              <span className="section-hint">Tes jeux favoris, d'après ton temps de jeu</span>
            </div>
            <span className="section-count">{top.length}</span>
          </motion.div>
          <motion.div className="games-grid" variants={container} initial="hidden" animate="show">
            {top.map(({ g, secs }) => <GameCard key={`top-${g.id}`} g={g} badge={formatPlaytime(secs)} onSelect={onSelect} />)}
          </motion.div>
        </section>
      )}

      {GAME_SECTIONS.map((section, si) => {
        const games = GAMES.filter(g => g.cat === section.cat);
        if (!games.length) return null;
        return (
          <section className="pick-section" key={section.cat}>
            <motion.div
              className="section-head"
              initial={{ opacity: 0, x: -14 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 + si * 0.08, type: "spring", stiffness: 300, damping: 26 }}
            >
              <span className="section-icon">{section.icon}</span>
              <div className="section-text">
                <span className="section-label">{section.label}</span>
                <span className="section-hint">{section.hint}</span>
              </div>
              <span className="section-count">{games.length}</span>
            </motion.div>

            <motion.div className="games-grid" variants={container} initial="hidden" animate="show">
              {games.map(g => <GameCard key={g.id} g={g} onSelect={onSelect} />)}
            </motion.div>
          </section>
        );
      })}
      </>
      )}
    </div>
  );
}
