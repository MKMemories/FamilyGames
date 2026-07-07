import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MEMBER_PRESETS, GAMES } from "../lib/gameData";
import { Logo } from "./Logo";
import heroClay from "../assets/hero-clay.webp";
import { Avatar } from "./Avatar";
import { AvatarStudio } from "./AvatarStudio";
import {
  type Avatar as AvatarT, PRESET_AVATARS, DEFAULT_AVATAR, decodeAvatar, encodeAvatar, randomAvatar,
} from "../lib/avatar";

interface HomeScreenProps {
  playerName: string | null;
  playerAvatar: string | null;
  onSelectPlayer: (name: string, color: string, avatar?: string) => void;
  onSetAvatar: (avatar: string) => void;
  onContinue: () => void;
  onPalmares: () => void;
  onToast: (msg: string) => void;
}

const AV_KEY = "khelij_avatars";
const PLAYERS_KEY = "khelij_players";
const ADD_COLORS = ["#ff87b2", "#7cc7ff", "#ffbe72", "#67d9b5", "#c084fc", "#f87171", "#38bdf8", "#fbbf24"];

interface CustomPlayer { name: string; color: string; }

function loadJSON<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; } catch { return fallback; }
}
function saveJSON(key: string, v: unknown) { try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* ignore */ } }

export function HomeScreen({ playerName, playerAvatar, onSelectPlayer, onSetAvatar, onContinue, onPalmares, onToast }: HomeScreenProps) {
  const [avatars, setAvatars] = useState<Record<string, string>>(() => loadJSON(AV_KEY, {}));
  const [players, setPlayers] = useState<CustomPlayer[]>(() => loadJSON<CustomPlayer[]>(PLAYERS_KEY, []));
  const [studio, setStudio] = useState(false);
  const [studioInit, setStudioInit] = useState<AvatarT>(DEFAULT_AVATAR);
  const [pendingNew, setPendingNew] = useState<CustomPlayer | null>(null);
  const [addMode, setAddMode] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(ADD_COLORS[0]);

  const avatarFor = useCallback((name: string): AvatarT => {
    return decodeAvatar(avatars[name]) || PRESET_AVATARS[name] || DEFAULT_AVATAR;
  }, [avatars]);

  const currentAvatar: AvatarT = useMemo(
    () => decodeAvatar(playerAvatar) || (playerName ? avatarFor(playerName) : DEFAULT_AVATAR),
    [playerAvatar, playerName, avatarFor],
  );

  const pickPlayer = (name: string, color: string) => {
    setAddMode(false);
    onSelectPlayer(name, color, encodeAvatar(avatarFor(name)));
  };

  /** Crée (ou met à jour) un joueur et le persiste avec son avatar. */
  const createPlayer = (name: string, color: string, avatar: AvatarT) => {
    const enc = encodeAvatar(avatar);
    const nextAv = { ...avatars, [name]: enc };
    setAvatars(nextAv); saveJSON(AV_KEY, nextAv);
    const isPreset = MEMBER_PRESETS.some(m => m.name === name);
    if (!isPreset && !players.some(p => p.name === name)) {
      const next = [...players, { name, color }];
      setPlayers(next); saveJSON(PLAYERS_KEY, next);
    }
    setAddMode(false); setNewName("");
    onSelectPlayer(name, color, enc);
  };

  const removePlayer = (name: string) => {
    const next = players.filter(p => p.name !== name);
    setPlayers(next); saveJSON(PLAYERS_KEY, next);
    const nextAv = { ...avatars }; delete nextAv[name]; setAvatars(nextAv); saveJSON(AV_KEY, nextAv);
    if (playerName === name) onSelectPlayer("", "");
    onToast(`${name} retiré`);
  };

  const openStudioEdit = () => {
    if (!playerName) { onToast("Choisis d'abord un joueur !"); return; }
    setPendingNew(null); setStudioInit(currentAvatar); setStudio(true);
  };
  const openStudioForNew = () => {
    if (!newName.trim()) { onToast("Écris d'abord un prénom !"); return; }
    setPendingNew({ name: newName.trim(), color: newColor }); setStudioInit(randomAvatar()); setStudio(true);
  };

  const saveAvatar = (a: AvatarT) => {
    setStudio(false);
    if (pendingNew) { createPlayer(pendingNew.name, pendingNew.color, a); setPendingNew(null); return; }
    if (!playerName) return;
    const enc = encodeAvatar(a);
    const next = { ...avatars, [playerName]: enc };
    setAvatars(next); saveJSON(AV_KEY, next);
    onSetAvatar(enc);
  };

  const handleContinue = () => {
    if (!playerName) { onToast("Choisis ou crée ton joueur d'abord !"); return; }
    onContinue();
  };

  if (studio) {
    return (
      <AvatarStudio
        initial={studioInit}
        name={pendingNew?.name || playerName || "Toi"}
        onSave={saveAvatar}
        onClose={() => { setStudio(false); setPendingNew(null); }}
      />
    );
  }

  const allPlayers = [...MEMBER_PRESETS.map(m => ({ name: m.name, color: m.color, preset: true })),
    ...players.map(p => ({ name: p.name, color: p.color, preset: false }))];

  return (
    <div className="screen home-screen">
      <div className="home-aurora" aria-hidden />

      <motion.div className="home-content" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 26 }}>
        <motion.div className="home-hero" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 24 }}>
          <img className="home-hero-img" src={heroClay} alt="" aria-hidden />
          <span className="home-hero-scrim" aria-hidden />
        </motion.div>
        <div className="home-logo home-logo--hero">
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
            {allPlayers.map((m, i) => (
              <motion.button
                key={m.name}
                className={`preset-btn av-preset ${playerName === m.name ? "active" : ""}`}
                style={{ "--pc": m.color } as React.CSSProperties}
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.12 + i * 0.05, type: "spring", stiffness: 400, damping: 24 }}
                whileTap={{ scale: 0.95 }} whileHover={{ y: -3 }}
                onClick={() => pickPlayer(m.name, m.color)}
              >
                <Avatar a={avatarFor(m.name)} size={54} ring={playerName === m.name ? m.color : undefined} />
                <span className="preset-name">{m.name}</span>
                {!m.preset && (
                  <span className="preset-remove" role="button" aria-label={`Retirer ${m.name}`}
                    onClick={e => { e.stopPropagation(); removePlayer(m.name); }}>✕</span>
                )}
              </motion.button>
            ))}

            {/* ➕ Ajouter un joueur */}
            <motion.button className="preset-btn av-add" onClick={() => { setAddMode(true); setNewName(""); }}
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.12 + allPlayers.length * 0.05, type: "spring", stiffness: 400, damping: 24 }}
              whileTap={{ scale: 0.95 }} whileHover={{ y: -3 }}>
              <span className="av-add-plus">＋</span>
              <span className="preset-name">Ajouter</span>
            </motion.button>
          </div>

          {/* Formulaire d'ajout */}
          <AnimatePresence>
            {addMode && (
              <motion.div className="add-form" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                <input className="inp add-name" placeholder="Prénom du nouveau joueur…" maxLength={14} autoFocus
                  value={newName} onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && newName.trim() && createPlayer(newName.trim(), newColor, randomAvatar())} />
                <div className="add-colors">
                  {ADD_COLORS.map(c => (
                    <button key={c} className={`add-sw ${newColor === c ? "on" : ""}`} style={{ background: c }}
                      onClick={() => setNewColor(c)} aria-label={`Couleur ${c}`} />
                  ))}
                </div>
                <div className="add-actions">
                  <button className="add-btn ghost" onClick={openStudioForNew}>🎨 Créer l'avatar</button>
                  <button className="add-btn primary" onClick={() => newName.trim() ? createPlayer(newName.trim(), newColor, randomAvatar()) : onToast("Écris un prénom !")}>✓ Ajouter</button>
                  <button className="add-btn" onClick={() => { setAddMode(false); setNewName(""); }}>Annuler</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Personnaliser l'avatar du joueur sélectionné */}
          <motion.button className="av-customize-btn" whileTap={{ scale: 0.97 }} whileHover={{ y: -2 }}
            onClick={openStudioEdit} disabled={!playerName}>
            <span className="av-cz-preview"><Avatar a={currentAvatar} size={40} /></span>
            <span className="av-cz-text">
              <b>Personnaliser mon avatar</b>
              <small>{playerName ? `Coiffure, tenue, accessoires… (${playerName})` : "Choisis d'abord un joueur"}</small>
            </span>
            <span className="av-cz-arrow">✨</span>
          </motion.button>
        </div>

        <motion.button className="btn btn-primary big-btn" onClick={handleContinue}
          whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}>
          Choisir un jeu →
        </motion.button>

        <motion.button className="home-palmares" onClick={onPalmares} whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}>
          🏆 Palmarès de la famille
        </motion.button>
      </motion.div>
    </div>
  );
}
