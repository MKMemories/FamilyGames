import { motion } from "framer-motion";
import { GAMES } from "../lib/gameData";
import type { GameId } from "../types";

interface PickScreenProps {
  onSelect: (game: GameId) => void;
  onBack: () => void;
}

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.045, delayChildren: 0.05 } },
};
const item = {
  hidden: { opacity: 0, y: 18, scale: 0.96 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring" as const, stiffness: 380, damping: 26 } },
};

export function PickScreen({ onSelect, onBack }: PickScreenProps) {
  return (
    <div className="screen pick-screen">
      <div className="screen-header">
        <button className="btn-back" onClick={onBack}>←</button>
        <h2>Choisis ton jeu</h2>
        <div style={{ width: 40 }} />
      </div>

      <motion.div className="games-grid" variants={container} initial="hidden" animate="show">
        {GAMES.map(g => (
          <motion.button
            key={g.id}
            className="game-card"
            style={{ "--gc": g.color } as React.CSSProperties}
            variants={item}
            whileHover={{ y: -5 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => onSelect(g.id)}
          >
            <div className="game-emoji">{g.emoji}</div>
            <div className="game-name">{g.name}</div>
            <div className="game-desc">{g.desc}</div>
            <div className="game-players">
              👥 {g.min === g.max ? g.min : `${g.min}–${g.max}`} joueurs
            </div>
          </motion.button>
        ))}
      </motion.div>
    </div>
  );
}
