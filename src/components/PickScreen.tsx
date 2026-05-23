import { GAMES } from "../lib/gameData";
import type { GameId } from "../types";

interface PickScreenProps {
  onSelect: (game: GameId) => void;
  onBack: () => void;
}

export function PickScreen({ onSelect, onBack }: PickScreenProps) {
  return (
    <div className="screen pick-screen">
      <div className="screen-header">
        <button className="btn-back" onClick={onBack}>←</button>
        <h2>Choisis ton jeu</h2>
        <div style={{ width: 40 }} />
      </div>
      <div className="games-grid">
        {GAMES.map(g => (
          <button
            key={g.id}
            className="game-card"
            style={{ "--gc": g.color } as React.CSSProperties}
            onClick={() => onSelect(g.id)}
          >
            <div className="game-emoji">{g.emoji}</div>
            <div className="game-name">{g.name}</div>
            <div className="game-desc">{g.desc}</div>
            <div className="game-players">
              👥 {g.min === g.max ? g.min : `${g.min}–${g.max}`} joueurs
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
