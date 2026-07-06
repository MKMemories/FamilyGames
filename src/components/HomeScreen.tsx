import { useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { MEMBER_PRESETS, GAMES } from "../lib/gameData";
import { Logo } from "./Logo";
import { Avatar } from "./Avatar";
import { AvatarStudio } from "./AvatarStudio";
import {
  type Avatar as AvatarT, PRESET_AVATARS, DEFAULT_AVATAR, decodeAvatar, encodeAvatar,
} from "../lib/avatar";

interface HomeScreenProps {
  playerName: string | null;
  playerAvatar: string | null;
  onSelectPlayer: (name: string, color: string, avatar?: string) => void;
  onSetAvatar: (avatar: string) => void;
  onContinue: () => void;
  onToast: (msg: string) => void;
}

const AV_KEY = "khelij_avatars";
function loadAvatars(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(AV_KEY) || "{}"); } catch { return {}; }
}
function persistAvatars(m: Record<string, string>) {
  try { localStorage.setItem(AV_KEY, JSON.stringify(m)); } catch { /* ignore */ }
}
const CUSTOM = "__custom";

export function HomeScreen({ playerName, playerAvatar, onSelectPlayer, onSetAvatar, onContinue, onToast }: HomeScreenProps) {
  const [customName, setCustomName] = useState("");
  const [avatars, setAvatars] = useState<Record<string, string>>(loadAvatars);
  const [studio, setStudio] = useState(false);

  const avatarFor = useCallback((name: string): AvatarT => {
    return decodeAvatar(avatars[name]) || PRESET_AVATARS[name] || DEFAULT_AVATAR;
  }, [avatars]);

  const selectedKey = customName.trim() ? CUSTOM : (playerName || "");
  const currentAvatar: AvatarT = useMemo(() => {
    return decodeAvatar(playerAvatar) || (selectedKey ? avatarFor(selectedKey) : DEFAULT_AVATAR);
  }, [playerAvatar, selectedKey, avatarFor]);

  const pickPreset = (m: typeof MEMBER_PRESETS[number]) => {
    setCustomName("");
    onSelectPlayer(m.name, m.color, encodeAvatar(avatarFor(m.name)));
  };

  const saveAvatar = (a: AvatarT) => {
    const key = selectedKey || CUSTOM;
    const enc = encodeAvatar(a);
    const next = { ...avatars, [key]: enc };
    setAvatars(next); persistAvatars(next);
    onSetAvatar(enc);
    setStudio(false);
  };

  const handleContinue = () => {
    if (customName.trim()) {
      onSelectPlayer(customName.trim(), "#c9b8ff", encodeAvatar(avatarFor(CUSTOM)));
      onContinue();
      return;
    }
    if (!playerName) { onToast("Choisis ton prénom d'abord !"); return; }
    onContinue();
  };

  if (studio) {
    return (
      <AvatarStudio
        initial={currentAvatar}
        name={customName.trim() || playerName || "Toi"}
        onSave={saveAvatar}
        onClose={() => setStudio(false)}
      />
    );
  }

  const hasIdentity = !!(customName.trim() || playerName);

  return (
    <div className="screen home-screen">
      <div className="home-aurora" aria-hidden />
      <div className="home-deco">
        <span>🎲</span><span>🃏</span><span>♟️</span><span>🔤</span><span>⏱️</span><span>🧠</span>
      </div>

      <motion.div className="home-content" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 26 }}>
        <div className="home-logo">
          <motion.div className="logo-badge" initial={{ scale: 0, rotate: -25 }} animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.05 }}>
            <Logo size={92} idSuffix="home" />
          </motion.div>
          <h1 className="logo-title">Family Game Night</h1>
          <div className="logo-sub">KHELIJ</div>
          <p className="home-tagline">Le salon de jeux de la famille — chacun son écran, tous ensemble ✨</p>
          <div className="home-chips">
            <span>🎮 {GAMES.length} jeux</span>
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
                className={`preset-btn av-preset ${playerName === m.name && !customName ? "active" : ""}`}
                style={{ "--pc": m.color } as React.CSSProperties}
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.15 + i * 0.06, type: "spring", stiffness: 400, damping: 24 }}
                whileTap={{ scale: 0.95 }} whileHover={{ y: -3 }}
                onClick={() => pickPreset(m)}
              >
                <Avatar a={avatarFor(m.name)} size={54} ring={playerName === m.name && !customName ? m.color : undefined} />
                <span className="preset-name">{m.name}</span>
              </motion.button>
            ))}
          </div>

          {/* Personnalisation d'avatar */}
          <motion.button className="av-customize-btn" whileTap={{ scale: 0.97 }} whileHover={{ y: -2 }}
            onClick={() => { if (!hasIdentity) { onToast("Choisis d'abord ton prénom !"); return; } setStudio(true); }}
            disabled={!hasIdentity}>
            <span className="av-cz-preview"><Avatar a={currentAvatar} size={40} /></span>
            <span className="av-cz-text">
              <b>Personnaliser mon avatar</b>
              <small>Coiffure, tenue, super-héros, accessoires…</small>
            </span>
            <span className="av-cz-arrow">✨</span>
          </motion.button>

          <div className="or-row"><span>ou</span></div>
          <div className="custom-name-row">
            <input className="inp" placeholder="Ton prénom…" maxLength={14} value={customName}
              onChange={e => { setCustomName(e.target.value); if (e.target.value) onSelectPlayer("", "", encodeAvatar(avatarFor(CUSTOM))); }} />
          </div>
        </div>

        <motion.button className="btn btn-primary big-btn" onClick={handleContinue}
          whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}>
          Choisir un jeu →
        </motion.button>
      </motion.div>
    </div>
  );
}
