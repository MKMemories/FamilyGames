import { useState } from "react";
import { GAMES } from "../lib/gameData";
import type { GameId } from "../types";

interface SetupScreenProps {
  game: GameId;
  onBack: () => void;
  onCreate: () => void;
  onJoin: (code: string) => void;
  onSolo: () => void;
  onToast: (msg: string) => void;
}

export function SetupScreen({ game, onBack, onCreate, onJoin, onSolo, onToast }: SetupScreenProps) {
  const [code, setCode] = useState("");
  const g = GAMES.find(x => x.id === game)!;

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
        <div className="setup-card solo-card" onClick={onSolo} style={{ cursor: "pointer" }}>
          <div className="setup-icon">🎮</div>
          <h3>Mode Solo (Test)</h3>
          <p>Lance une partie seul immédiatement — pas besoin d'autres joueurs.</p>
          <button className="btn btn-accent" onClick={e => { e.stopPropagation(); onSolo(); }}>
            Jouer en Solo →
          </button>
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
