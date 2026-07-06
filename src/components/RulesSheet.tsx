import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GAME_RULES } from "../lib/gameRules";
import type { GameId } from "../types";

/** Bouton d'aide discret « ? » (coin haut-droit) qui ouvre les règles dans une
 *  fiche modale. Ne s'affiche QUE pour les jeux non intuitifs (présents dans
 *  GAME_RULES) → l'interface reste épurée pour les jeux évidents. */
export function RulesSheet({ gameId }: { gameId: GameId }) {
  const rule = GAME_RULES[gameId];
  const [open, setOpen] = useState(false);
  if (!rule) return null;

  return (
    <>
      <button className="rules-fab" onClick={() => setOpen(true)} aria-label="Voir les règles" title="Règles">?</button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="rules-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          >
            <motion.div
              className="rules-card"
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 320, damping: 26 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="rules-head">
                <span className="rules-emoji">{rule.emoji}</span>
                <span className="rules-title">Comment jouer — {rule.title}</span>
                <button className="rules-close" onClick={() => setOpen(false)} aria-label="Fermer">✕</button>
              </div>
              <ol className="rules-list">
                {rule.lines.map((l, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 + i * 0.05 }}
                  >
                    {l}
                  </motion.li>
                ))}
              </ol>
              <button className="rules-got" onClick={() => setOpen(false)}>C'est parti !</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{RULES_CSS}</style>
    </>
  );
}

const RULES_CSS = `
.rules-fab{position:fixed;top:16px;right:70px;z-index:40;width:34px;height:34px;border-radius:50%;
  border:1px solid var(--border);background:var(--surface-1);color:var(--muted);
  font-family:var(--font-d);font-size:1.05rem;line-height:1;cursor:pointer;
  box-shadow:var(--shadow);display:grid;place-items:center;opacity:.85;transition:opacity .15s,transform .12s,color .15s;}
.rules-fab:hover{opacity:1;transform:scale(1.08);color:var(--accent);border-color:var(--accent);}
.rules-fab:active{transform:scale(.96);}

.rules-overlay{position:fixed;inset:0;z-index:60;display:grid;place-items:center;padding:1rem;
  background:rgba(10,10,25,.55);backdrop-filter:blur(4px);}
.rules-card{width:100%;max-width:440px;background:var(--surface-1);color:var(--text);
  border:1px solid var(--border);border-radius:20px;box-shadow:var(--shadow-lg);
  padding:1.2rem 1.2rem 1rem;max-height:86vh;overflow-y:auto;}
.rules-head{display:flex;align-items:center;gap:.55rem;margin-bottom:.7rem;}
.rules-emoji{font-size:1.5rem;}
.rules-title{font-family:var(--font-d);font-size:1.05rem;flex:1;line-height:1.15;}
.rules-close{border:none;background:transparent;color:var(--muted);font-size:1.05rem;cursor:pointer;
  width:30px;height:30px;border-radius:50%;flex:0 0 auto;}
.rules-close:hover{background:var(--surface-2,rgba(0,0,0,.06));color:var(--text);}
.rules-list{margin:0;padding:0 0 0 1.25rem;display:flex;flex-direction:column;gap:.5rem;}
.rules-list li{font-size:.92rem;line-height:1.4;color:var(--text);}
.rules-list li::marker{color:var(--accent);font-weight:900;}
.rules-got{margin-top:1rem;width:100%;border:none;border-radius:999px;padding:.75rem;cursor:pointer;
  font-family:var(--font-b);font-weight:900;color:#fff;font-size:1rem;
  background:linear-gradient(135deg,var(--primary),var(--accent));box-shadow:var(--shadow);}
.rules-got:active{transform:translateY(1px);}
`;
