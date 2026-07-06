import { useState } from "react";
import { motion } from "framer-motion";
import { MEMBER_PRESETS } from "../lib/gameData";
import { Logo } from "./Logo";

interface HomeScreenProps {
  playerName: string | null;
  onSelectPlayer: (name: string, color: string) => void;
  onContinue: () => void;
  onToast: (msg: string) => void;
}

export function HomeScreen({ playerName, onSelectPlayer, onContinue, onToast }: HomeScreenProps) {
  const [customName, setCustomName] = useState("");

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
      <div className="home-aurora" aria-hidden />
      <div className="home-deco">
        <span>🎲</span><span>🃏</span><span>♟️</span><span>🔤</span><span>⏱️</span><span>🧠</span>
      </div>

      <motion.div
        className="home-content"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 26 }}
      >
        <div className="home-logo">
          <motion.div
            className="logo-badge"
            initial={{ scale: 0, rotate: -25 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.05 }}
          >
            <Logo size={92} idSuffix="home" />
          </motion.div>
          <h1 className="logo-title">Family Game Night</h1>
          <div className="logo-sub">KHELIJ</div>
          <p className="home-tagline">Le salon de jeux de la famille — chacun son écran, tous ensemble ✨</p>
          <div className="home-chips">
            <span>🎮 20 jeux</span>
            <span>👨‍👩‍👧‍👦 2–8 joueurs</span>
            <span>🤖 Solo & multi</span>
          </div>
        </div>

        <div className="player-presets">
          <p className="label-sm">Qui es-tu ?</p>
          <div className="preset-grid">
            {MEMBER_PRESETS.map((m, i) => (
              <motion.button
                key={m.name}
                className={`preset-btn ${playerName === m.name ? "active" : ""}`}
                style={{ "--pc": m.color } as React.CSSProperties}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.15 + i * 0.06, type: "spring", stiffness: 400, damping: 24 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => { onSelectPlayer(m.name, m.color); setCustomName(""); }}
              >
                <span className="preset-emoji">{m.emoji}</span>
                <span className="preset-name">{m.name}</span>
              </motion.button>
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

        <motion.button
          className="btn btn-primary big-btn"
          onClick={handleContinue}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.97 }}
        >
          Choisir un jeu →
        </motion.button>
      </motion.div>
    </div>
  );
}
