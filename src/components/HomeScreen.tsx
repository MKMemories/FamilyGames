import { useState } from "react";
import { MEMBER_PRESETS } from "../lib/gameData";

interface HomeScreenProps {
  playerName: string | null;
  onSelectPlayer: (name: string, color: string) => void;
  onContinue: () => void;
  onToast: (msg: string) => void;
}

export function HomeScreen({ playerName, onSelectPlayer, onContinue, onToast }: HomeScreenProps) {
  const [customName, setCustomName] = useState("");
  const preset = MEMBER_PRESETS.find(m => m.name === playerName);

  const handleContinue = () => {
    if (customName.trim()) {
      onSelectPlayer(customName.trim(), "#c9b8ff");
      onContinue();
      return;
    }
    if (!playerName) {
      onToast("Choisis ton prénom d'abord !");
      return;
    }
    onContinue();
  };

  return (
    <div className="screen home-screen">
      <div className="home-deco">
        <span>🎲</span><span>🃏</span><span>♟️</span><span>🔤</span><span>⏱️</span><span>🧠</span>
      </div>
      <div className="home-content">
        <div className="home-logo">
          <span className="logo-badge">🎮</span>
          <h1 className="logo-title">Family Game Night</h1>
          <div className="logo-sub">KHELIJ</div>
        </div>
        <div className="player-presets">
          <p className="label-sm">Qui es-tu ?</p>
          <div className="preset-grid">
            {MEMBER_PRESETS.map(m => (
              <button
                key={m.name}
                className={`preset-btn ${playerName === m.name ? "active" : ""}`}
                style={{ "--pc": m.color } as React.CSSProperties}
                onClick={() => { onSelectPlayer(m.name, m.color); setCustomName(""); }}
              >
                <span className="preset-emoji">{m.emoji}</span>
                <span className="preset-name">{m.name}</span>
              </button>
            ))}
          </div>
          <div className="or-row"><span>ou</span></div>
          <div className="custom-name-row">
            <input
              className="inp"
              placeholder="Ton prénom…"
              maxLength={14}
              value={customName}
              onChange={e => { setCustomName(e.target.value); if (e.target.value) onSelectPlayer("", ""); }}
            />
          </div>
        </div>
        <button className="btn btn-primary big-btn" onClick={handleContinue}>
          Choisir un jeu →
        </button>
      </div>
    </div>
  );
}
