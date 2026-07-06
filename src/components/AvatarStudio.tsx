import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar } from "./Avatar";
import { fx } from "../lib/sound";
import {
  type Avatar as AvatarT, SKINS, BGS, HAIR_COLORS, OUTFIT_COLORS,
  HAIRS, EYES, MOUTHS, OUTFITS, FACIALS, ACCESSORIES, AVATAR_PACKS, randomAvatar,
} from "../lib/avatar";

interface Props {
  initial: AvatarT;
  name: string;
  onSave: (a: AvatarT) => void;
  onClose: () => void;
}

type Tab =
  | { key: keyof AvatarT; label: string; icon: string; kind: "style"; names: readonly string[] }
  | { key: keyof AvatarT; label: string; icon: string; kind: "color"; colors: string[] };

const TABS: Tab[] = [
  { key: "hair", label: "Coiffure", icon: "💇", kind: "style", names: HAIRS },
  { key: "hairColor", label: "Couleur", icon: "🎨", kind: "color", colors: HAIR_COLORS },
  { key: "eyes", label: "Yeux", icon: "👀", kind: "style", names: EYES },
  { key: "mouth", label: "Bouche", icon: "👄", kind: "style", names: MOUTHS },
  { key: "outfit", label: "Tenue", icon: "👕", kind: "style", names: OUTFITS },
  { key: "facial", label: "Barbe", icon: "🧔", kind: "style", names: FACIALS },
  { key: "accessory", label: "Accessoire", icon: "🕶️", kind: "style", names: ACCESSORIES },
  { key: "skin", label: "Peau", icon: "🖐️", kind: "color", colors: SKINS },
  { key: "bg", label: "Fond", icon: "🌈", kind: "color", colors: BGS.map(b => b.to) },
];

export function AvatarStudio({ initial, name, onSave, onClose }: Props) {
  const [tab, setTab] = useState<keyof AvatarT>("hair");
  // Historique complet → « annuler / refaire » chaque changement.
  const [history, setHistory] = useState<AvatarT[]>([initial]);
  const [ptr, setPtr] = useState(0);
  const a = history[ptr];

  const active = TABS.find(t => t.key === tab)!;
  const commit = (next: AvatarT) => { setHistory(h => [...h.slice(0, ptr + 1), next]); setPtr(p => p + 1); };
  const set = (patch: Partial<AvatarT>) => { fx("tap"); commit({ ...a, ...patch }); };
  const applyPack = (patch: Partial<AvatarT>) => { fx("select"); commit({ ...a, ...patch }); };
  const surprise = () => { fx("point"); commit(randomAvatar()); };
  const canUndo = ptr > 0, canRedo = ptr < history.length - 1;
  const undo = () => { if (canUndo) { fx("swap"); setPtr(p => p - 1); } };
  const redo = () => { if (canRedo) { fx("swap"); setPtr(p => p + 1); } };
  const reset = () => { if (ptr !== 0 || history.length > 1) { fx("swap"); commit(initial); } };

  return (
    <div className="screen avstudio">
      <div className="game-topbar avstudio-bar">
        <button className="btn-back" onClick={onClose}>✕</button>
        <div className="turn-indicator">🎭 Mon avatar</div>
        <button className="av-dice" onClick={reset} title="Tout réinitialiser" disabled={!canUndo && !canRedo}>⟲</button>
      </div>

      {/* Scène de prévisualisation */}
      <div className="av-stage">
        <div className="av-halo" />
        <motion.div key={ptr} initial={{ scale: 0.9, rotate: -3 }} animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 18 }} className="av-preview-wrap">
          <Avatar a={a} size={168} />
        </motion.div>
        <div className="av-name">{name || "Toi"}</div>
      </div>

      {/* Annuler / Surprise / Refaire */}
      <div className="av-controls">
        <button className="av-ctrl" onClick={undo} disabled={!canUndo}>↩ Annuler</button>
        <button className="av-ctrl surprise" onClick={surprise}>🎲 Surprise</button>
        <button className="av-ctrl" onClick={redo} disabled={!canRedo}>Refaire ↪</button>
      </div>

      {/* Packs à la mode */}
      <div className="av-packs-label">✨ Looks à la mode</div>
      <div className="av-packs">
        {AVATAR_PACKS.map(p => (
          <button key={p.id} className="av-pack" onClick={() => applyPack(p.patch)}>
            <span className="av-pack-emoji">{p.emoji}</span>
            <span className="av-pack-label">{p.label}</span>
          </button>
        ))}
      </div>

      {/* Onglets de catégorie */}
      <div className="av-tabs">
        {TABS.map(t => (
          <button key={String(t.key)} className={`av-tab ${tab === t.key ? "on" : ""}`} onClick={() => { fx("tap"); setTab(t.key); }}>
            <span className="av-tab-icon">{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {/* Grille d'options de l'onglet actif */}
      <AnimatePresence mode="wait">
        <motion.div key={String(tab)} className="av-options"
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>
          {active.kind === "color"
            ? active.colors.map((col, i) => (
                <button key={i} className={`av-swatch ${a[active.key] === i ? "on" : ""}`}
                  style={{ background: active.key === "bg" ? `linear-gradient(140deg, ${BGS[i].from}, ${BGS[i].to})` : col }}
                  onClick={() => set({ [active.key]: i } as Partial<AvatarT>)}>
                  {a[active.key] === i && <span className="av-check">✓</span>}
                </button>
              ))
            : active.names.map((nm, i) => (
                <button key={i} className={`av-opt ${a[active.key] === i ? "on" : ""}`}
                  onClick={() => set({ [active.key]: i } as Partial<AvatarT>)}>
                  <Avatar a={{ ...a, [active.key]: i }} size={56} flat />
                  <span className="av-opt-label">{nm}</span>
                </button>
              ))}
        </motion.div>
      </AnimatePresence>

      <div className="av-save-bar">
        <motion.button className="btn btn-primary big-btn" whileTap={{ scale: 0.97 }}
          onClick={() => { fx("victory"); onSave(a); }}>
          Valider mon avatar ✓
        </motion.button>
      </div>
    </div>
  );
}
