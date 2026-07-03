import { useState } from "react";
import { GAMES, gameSupportsAI, DIFFICULTIES } from "../lib/gameData";
import type { GameId, Difficulty } from "../types";

interface SetupScreenProps {
  game: GameId;
  onBack: () => void;
  onCreate: () => void;
  onJoin: (code: string) => void;
  onSolo: (difficulty?: Difficulty) => void;
  onToast: (msg: string) => void;
}

export function SetupScreen({ game, onBack, onCreate, onJoin, onSolo, onToast }: SetupScreenProps) {
  const [code, setCode] = useState("");
  const g = GAMES.find(x => x.id === game)!;
  const hasAI = gameSupportsAI(game);

  const handleJoin = () => {
    if (!code.trim()) { onToast("Saisis un code !"); return; }
    onJoin(code.trim().toUpperCase());
  };

  return (
    <div className="screen setup-screen">
      <div className="screen-header">
        <button className="btn-back" onClick={onBack}>←</button>
        <h2>{g.emoji} {g.name}</h2>
        <div style={{ width: 40 }} />
      </div>

      <div className="setup-cards">
        <div className="setup-card solo-card">
          <div className="setup-icon">🤖</div>
          <h3>{hasAI ? "Jouer contre l'ordinateur" : "Mode Solo"}</h3>
          {hasAI ? (
            <>
              <p>Choisis la difficulté et affronte l'ordinateur.</p>
              <div className="difficulty-grid">
                {DIFFICULTIES.map(d => (
                  <button
                    key={d.id}
                    className={`difficulty-btn diff-${d.id}`}
                    onClick={() => onSolo(d.id)}
                  >
                    <span className="diff-emoji">{d.emoji}</span>
                    <span className="diff-label">{d.label}</span>
                    <span className="diff-desc">{d.desc}</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <p>Lance une partie seul immédiatement — pas besoin d'autres joueurs.</p>
              <button className="btn btn-accent" onClick={() => onSolo()}>
                Jouer en Solo →
              </button>
            </>
          )}
        </div>

        <div className="divider-or">ou en multijoueur</div>

        <div className="setup-card">
          <div className="setup-icon">🏠</div>
          <h3>Créer une partie</h3>
          <p>Tu crées le salon, les autres te rejoignent avec le code.</p>
          <button className="btn btn-primary" onClick={onCreate}>Créer le salon</button>
        </div>

        <div className="divider-or">ou</div>

        <div className="setup-card">
          <div className="setup-icon">🚪</div>
          <h3>Rejoindre</h3>
          <p>Saisis le code donné par l'hôte.</p>
          <div className="code-input-row">
            <input
              className="inp"
              placeholder="CODE"
              maxLength={6}
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === "Enter" && handleJoin()}
              style={{ letterSpacing: ".15em", fontSize: "1.2rem", textAlign: "center", textTransform: "uppercase" }}
            />
            <button className="btn btn-accent" onClick={handleJoin}>OK</button>
          </div>
        </div>
      </div>
    </div>
  );
}
