import { motion } from "framer-motion";
import { JOKER_DEFS, type JokerType } from "../lib/jokers";

interface JokerBarProps {
  types: JokerType[];                       // jokers proposés par ce jeu, dans l'ordre
  counts: Record<string, number>;           // stock restant du joueur (par type)
  active?: string | null;                   // joker déjà activé pour cette manche
  disabled?: boolean;                       // ex. le joueur a déjà répondu
  disabledTypes?: JokerType[];              // jokers momentanément indisponibles
  onUse: (type: JokerType) => void;
}

/** Barre de jokers partagée — pastilles tactiles, thème clair + sombre. */
export function JokerBar({ types, counts, active, disabled, disabledTypes, onUse }: JokerBarProps) {
  return (
    <div className="joker-bar">
      {types.map((t) => {
        const def = JOKER_DEFS[t];
        const left = counts[t] ?? 0;
        const isActive = active === t;
        const spent = left <= 0;
        const momentarily = disabledTypes?.includes(t) ?? false;
        const isDisabled = !!disabled || spent || momentarily || (!!active && !isActive);
        return (
          <motion.button
            key={t}
            className={`joker-chip ${isActive ? "active" : ""} ${spent ? "spent" : ""}`}
            onClick={() => !isDisabled && onUse(t)}
            disabled={isDisabled}
            whileHover={isDisabled ? undefined : { scale: 1.05, y: -2 }}
            whileTap={isDisabled ? undefined : { scale: 0.94 }}
            title={def.desc}
          >
            <span className="joker-emoji">{def.emoji}</span>
            <span className="joker-label">{def.label}</span>
            {isActive ? <span className="joker-badge on">actif</span> : null}
          </motion.button>
        );
      })}
      <style>{JOKER_CSS}</style>
    </div>
  );
}

const JOKER_CSS = `
.joker-bar{display:flex;gap:.5rem;justify-content:center;flex-wrap:wrap;
  max-width:560px;margin:0 auto;width:calc(100% - 1.6rem);}
.joker-chip{position:relative;display:flex;flex-direction:column;align-items:center;gap:.1rem;
  min-width:74px;padding:.45rem .6rem;border-radius:14px;cursor:pointer;
  border:1.5px solid var(--border);background:var(--surface-1);color:var(--text);
  box-shadow:var(--shadow);transition:border-color .15s,opacity .15s,transform .15s;font-family:var(--font-b);}
.joker-chip:disabled{cursor:not-allowed;opacity:.42;}
.joker-chip.active{border-color:var(--accent);
  background:linear-gradient(135deg,rgba(var(--accent-rgb),.18),var(--surface-1));
  box-shadow:0 0 0 3px rgba(var(--accent-rgb),.25);opacity:1;}
.joker-chip.spent{opacity:.32;}
.joker-emoji{font-size:1.25rem;line-height:1;}
.joker-label{font-size:.66rem;font-weight:900;text-transform:uppercase;letter-spacing:.03em;color:var(--muted);}
.joker-chip.active .joker-label{color:var(--accent);}
.joker-badge.on{position:absolute;top:-7px;right:-6px;font-size:.56rem;font-weight:900;color:#fff;
  background:var(--accent);padding:.05rem .3rem;border-radius:999px;text-transform:uppercase;letter-spacing:.04em;}
`;
