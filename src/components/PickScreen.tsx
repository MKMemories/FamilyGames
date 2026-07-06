import { motion } from "framer-motion";
import { GAMES, GAME_SECTIONS } from "../lib/gameData";
import type { GameId } from "../types";

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
  if (min === max) return `${min}`;
  return `${min}–${max}`;
}

export function PickScreen({ onSelect, onBack }: PickScreenProps) {
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
              {games.map(g => (
                <motion.button
                  key={g.id}
                  className={`game-card ${g.star ? "star" : ""}`}
                  style={{ "--gc": g.color, "--gc2": g.grad } as React.CSSProperties}
                  variants={item}
                  whileHover={{ y: -6 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onSelect(g.id)}
                >
                  {g.star && <span className="game-ribbon">★ Soirée</span>}
                  <span className="game-medallion">
                    <span className="game-emoji">{g.emoji}</span>
                    <span className="game-sheen" aria-hidden />
                  </span>
                  <span className="game-name">{g.name}</span>
                  <span className="game-desc">{g.desc}</span>
                  <span className="game-players">
                    <span className="gp-people">{g.max === 1 ? "🧑" : g.max >= 4 ? "👨‍👩‍👧‍👦" : "👥"}</span>
                    {playersLabel(g.min, g.max)} joueur{g.max > 1 ? "s" : ""}
                  </span>
                </motion.button>
              ))}
            </motion.div>
          </section>
        );
      })}
    </div>
  );
}
