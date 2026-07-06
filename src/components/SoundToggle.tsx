import { useState } from "react";
import { isMuted, toggleMuted, fx } from "../lib/sound";

/** Bouton muet global (coin haut-droit). Le clic « activer » sert aussi de
 *  geste utilisateur qui débloque l'audio du navigateur. */
export function SoundToggle() {
  const [muted, setM] = useState(isMuted());
  return (
    <button
      className="sound-toggle"
      onClick={() => { const nm = toggleMuted(); setM(nm); if (!nm) fx("select"); }}
      aria-label={muted ? "Activer le son" : "Couper le son"}
      title="Son activé / coupé"
    >
      {muted ? "🔇" : "🔊"}
      <style>{`
        .sound-toggle{position:fixed;top:max(14px,env(safe-area-inset-top));right:14px;z-index:200;
          width:46px;height:46px;border-radius:50%;background:var(--surface-1);border:1px solid var(--border);
          box-shadow:var(--shadow);backdrop-filter:blur(12px);display:flex;align-items:center;justify-content:center;
          font-size:1.2rem;cursor:pointer;transition:transform .25s cubic-bezier(.34,1.56,.64,1),box-shadow .2s;}
        .sound-toggle:hover{transform:scale(1.08);box-shadow:var(--shadow-lg);}
        .sound-toggle:active{transform:scale(.9);}
      `}</style>
    </button>
  );
}
