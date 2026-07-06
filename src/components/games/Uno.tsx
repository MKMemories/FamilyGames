import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { dbRef, update } from "../../lib/firebase";
import { fx } from "../../lib/sound";
import { useSoloAI } from "../../hooks/useSoloAI";
import {
  initUno, playCard, drawTurn, passTurn, callUno, playable, currentId, top, aiPlay,
  COLORS, COLOR_HEX, COLOR_NAME, label, type UnoState, type UCard, type UColor,
} from "../../lib/unoEngine";
import type { Room } from "../../types";

interface Props {
  room: Room; roomId: string; playerId: string; isHost: boolean; isSolo: boolean;
  onLeave: () => void; onToast: (m: string) => void;
}
const shuffle = <T,>(a: T[]): T[] => { const r = [...a]; for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; };

/* Carte UNO premium. */
function Card({ card, big, dim, onClick }: { card: UCard; big?: boolean; dim?: boolean; onClick?: () => void }) {
  const isWild = card.c === "w";
  const bg = isWild ? "conic-gradient(from 45deg,#e0403f,#f4c430,#2fa66a,#3b6fe0,#e0403f)" : COLOR_HEX[card.c];
  return (
    <button className={`uno-card ${big ? "big" : ""} ${dim ? "dim" : ""}`} style={{ background: bg }} onClick={onClick} disabled={!onClick}>
      <span className="uno-oval">
        <span className="uno-val" style={{ color: isWild ? "#fff" : COLOR_HEX[card.c] }}>{label(card)}</span>
      </span>
      <span className="uno-corner tl">{label(card)}</span>
      <span className="uno-corner br">{label(card)}</span>
    </button>
  );
}

export function Uno({ room, roomId, playerId, isHost, isSolo, onLeave, onToast }: Props) {
  const players = Object.values(room.players || {});
  const uno = room.uno as UnoState | null;
  const nameOf = (id: string) => (room.players || {})[id]?.name || "Joueur";
  const [wildIdx, setWildIdx] = useState<number | null>(null); // carte joker en attente de couleur

  const cur = uno ? currentId(uno) : "";
  const isMyTurn = cur === playerId;
  const myHand = uno?.hands[playerId] || [];

  const write = (u: UnoState) => {
    const upd: Record<string, unknown> = { uno: u };
    if (u.phase === "over") {
      const scores: Record<string, number> = {};
      u.order.forEach(id => { scores[id] = -(u.hands[id]?.length || 0); });
      upd.status = "finished"; upd.winner = nameOf(u.winner || u.order[0]); upd.scores = scores;
    }
    update(dbRef(`games/${roomId}`), upd);
  };

  const startGame = () => {
    if (players.length < 2) { onToast("Il faut au moins 2 joueurs"); return; }
    update(dbRef(`games/${roomId}`), { uno: initUno(shuffle(players.map(p => p.id)), Math.random) });
  };

  const play = (idx: number) => {
    if (!uno || !isMyTurn) return;
    const card = myHand[idx];
    if (!playable(uno, playerId, card)) { onToast("Carte non jouable"); fx("wrong"); return; }
    if (card.c === "w") { setWildIdx(idx); return; } // choisir la couleur
    fx("place");
    write(playCard(uno, idx, null, uno.saidUno[playerId]));
  };
  const chooseColor = (col: UColor) => {
    if (!uno || wildIdx == null) return;
    fx("place");
    write(playCard(uno, wildIdx, col, uno.saidUno[playerId]));
    setWildIdx(null);
  };
  const draw = () => { if (uno && isMyTurn) { fx("tap"); write(drawTurn(uno)); } };
  const pass = () => { if (uno && isMyTurn) { fx("select"); write(passTurn(uno)); } };
  const sayUno = () => { if (uno && isMyTurn) { fx("point"); write(callUno(uno)); } };

  /* IA solo */
  const aiId = room.aiId;
  const aiActive = !!aiId && !!uno && uno.phase === "play" && cur === aiId && isHost;
  useSoloAI(aiActive, `${uno?.discard.length}-${cur}-${uno?.hands[aiId || ""]?.length}`, () => {
    if (!uno || !aiId) return;
    write(aiPlay(uno, Math.random));
  }, 950);

  if (!uno) {
    return (
      <div className="screen game-screen uno-screen">
        <div className="game-topbar"><button className="btn-back" onClick={onLeave}>✕</button><div className="turn-indicator">🎴 UNO KHELIJ</div><div /></div>
        <div className="uno-start">
          <div className="uno-start-badge">🎴</div>
          <h1 className="uno-start-title">UNO KHELIJ</h1>
          <p className="uno-start-sub">Débarrasse-toi de toutes tes cartes ! Assortis la couleur ou le chiffre, dégaine les cartes spéciales (Passe, Sens, +2, Joker, +4)… et n'oublie surtout pas de crier UNO !</p>
          <div className="uno-mini-row">{COLORS.map(c => <span key={c} className="uno-mini" style={{ background: COLOR_HEX[c] }} />)}</div>
          {isHost ? <button className="uno-btn uno-btn-primary" onClick={startGame}>Distribuer & commencer →</button>
                  : <div className="uno-hint">⏳ En attente de l'hôte…</div>}
          {players.length < 2 && <div className="uno-hint uno-warn">Il faut au moins 2 joueurs</div>}
        </div>
        <style>{UNO_CSS}</style>
      </div>
    );
  }

  const over = uno.phase === "over";
  const t = top(uno);
  const others = uno.order.filter(id => id !== playerId);

  return (
    <div className="screen game-screen uno-screen">
      <div className="game-topbar">
        <button className="btn-back" onClick={onLeave}>✕</button>
        <div className="turn-indicator" style={{ background: isMyTurn && !over ? "rgba(36,178,107,.18)" : "rgba(0,0,0,.05)" }}>
          {over ? `🏆 ${nameOf(uno.winner || "")} gagne !` : isMyTurn ? "🟢 Ton tour !" : `⏳ ${nameOf(cur)}`}
        </div>
        <div className="uno-dir">{uno.dir === 1 ? "⟳" : "⟲"}</div>
      </div>

      {/* Adversaires */}
      <div className="uno-opponents">
        {others.map(id => (
          <div key={id} className={`uno-opp ${id === cur && !over ? "cur" : ""}`}>
            <span className="uno-opp-name">{nameOf(id).slice(0, 7)}</span>
            <div className="uno-opp-cards">
              {Array.from({ length: Math.min(uno.hands[id]?.length || 0, 7) }).map((_, i) => <span key={i} className="uno-back-mini" />)}
            </div>
            <span className={`uno-opp-count ${(uno.hands[id]?.length || 0) === 1 ? "uno1" : ""}`}>{uno.hands[id]?.length || 0}{(uno.hands[id]?.length || 0) === 1 ? " · UNO" : ""}</span>
          </div>
        ))}
      </div>

      {/* Centre : pioche + défausse */}
      <div className="uno-center">
        <button className="uno-draw-pile" onClick={draw} disabled={!isMyTurn || over} title="Piocher">
          <span className="uno-back-logo">UNO</span>
          <span className="uno-draw-count">{uno.draw.length}</span>
        </button>
        <div className="uno-discard">
          <AnimatePresence mode="popLayout">
            <motion.div key={uno.discard.length + t.c + t.v} initial={{ scale: 0.6, rotate: -12, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} transition={{ type: "spring", stiffness: 320, damping: 20 }}>
              <Card card={t.c === "w" ? { c: uno.activeColor, v: t.v } : t} big />
            </motion.div>
          </AnimatePresence>
          <span className="uno-active-color" style={{ background: COLOR_HEX[uno.activeColor] }} title={COLOR_NAME[uno.activeColor]} />
        </div>
      </div>

      {/* Actions contextuelles */}
      <div className="uno-actions">
        {isMyTurn && !over && uno.drewPlayable && <button className="uno-btn uno-btn-ghost" onClick={pass}>Passer</button>}
        {isMyTurn && !over && myHand.length === 2 && !uno.saidUno[playerId] && <button className="uno-btn uno-btn-uno" onClick={sayUno}>UNO !</button>}
      </div>

      {/* Ma main */}
      <div className="uno-hand">
        {myHand.map((card, i) => {
          const canPlay = isMyTurn && !over && playable(uno, playerId, card);
          return (
            <motion.div key={i} className="uno-hand-card" whileHover={canPlay ? { y: -14 } : {}} style={{ zIndex: i }}>
              <Card card={card} dim={isMyTurn && !over && !canPlay} onClick={canPlay ? () => play(i) : undefined} />
            </motion.div>
          );
        })}
      </div>

      {/* Journal */}
      <div className="uno-log">{(uno.log || []).slice(-2).map((l, i) => <div key={i} className="uno-log-row">{l.replace(/\b(zzz-ai)\b/g, "Ordinateur")}</div>)}</div>

      {/* Choix de couleur (joker) */}
      <AnimatePresence>
        {wildIdx != null && (
          <motion.div className="uno-color-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setWildIdx(null)}>
            <motion.div className="uno-color-card" initial={{ scale: 0.9 }} animate={{ scale: 1 }} onClick={e => e.stopPropagation()}>
              <div className="uno-color-title">Choisis une couleur</div>
              <div className="uno-color-grid">
                {COLORS.map(c => <button key={c} className="uno-color-btn" style={{ background: COLOR_HEX[c] }} onClick={() => chooseColor(c)}>{COLOR_NAME[c]}</button>)}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{UNO_CSS}</style>
    </div>
  );
}

const UNO_CSS = `
.uno-screen{max-width:600px;margin:0 auto;}
.uno-dir{font-size:1.3rem;color:var(--muted);}
.uno-opponents{display:flex;gap:.5rem;justify-content:center;flex-wrap:wrap;margin:.3rem 0;}
.uno-opp{display:flex;flex-direction:column;align-items:center;gap:.15rem;padding:.35rem .6rem;border-radius:12px;background:var(--surface-1);border:1.5px solid var(--border);}
.uno-opp.cur{box-shadow:0 0 0 2px rgba(var(--accent-rgb),.4);}
.uno-opp-name{font-size:.76rem;font-weight:800;color:var(--text);}
.uno-opp-cards{display:flex;}
.uno-back-mini{width:9px;height:14px;border-radius:2px;margin-left:-4px;background:linear-gradient(135deg,#2b2f3a,#141824);border:1px solid rgba(255,255,255,.15);}
.uno-opp-count{font-size:.72rem;font-weight:900;color:var(--muted);}
.uno-opp-count.uno1{color:var(--danger);}

.uno-center{display:flex;gap:1.4rem;justify-content:center;align-items:center;margin:.6rem 0;}
.uno-draw-pile{position:relative;width:66px;height:96px;border-radius:12px;cursor:pointer;border:none;
  background:linear-gradient(135deg,#2b2f3a,#141824);box-shadow:0 8px 20px rgba(0,0,0,.35);display:grid;place-items:center;}
.uno-draw-pile:disabled{opacity:.6;cursor:default;}
.uno-back-logo{font-family:var(--font-d);font-style:italic;color:#f4c430;font-size:1.1rem;transform:rotate(-18deg);text-shadow:0 2px 4px rgba(0,0,0,.5);}
.uno-draw-count{position:absolute;bottom:4px;right:6px;font-size:.7rem;font-weight:800;color:rgba(255,255,255,.8);}
.uno-discard{position:relative;}
.uno-active-color{position:absolute;top:-6px;right:-6px;width:18px;height:18px;border-radius:50%;border:2px solid var(--surface-1);box-shadow:var(--shadow);}

.uno-card{position:relative;width:56px;height:82px;border-radius:10px;border:none;cursor:pointer;padding:0;
  box-shadow:0 4px 10px rgba(0,0,0,.3),inset 0 0 0 3px rgba(255,255,255,.85);overflow:hidden;}
.uno-card:disabled{cursor:default;}
.uno-card.big{width:66px;height:96px;}
.uno-card.dim{opacity:.42;filter:grayscale(.4);}
.uno-oval{position:absolute;inset:14% 10%;background:#fff;border-radius:50%/40%;transform:rotate(-32deg);display:grid;place-items:center;}
.uno-val{transform:rotate(32deg);font-family:var(--font-d);font-weight:900;font-size:1.5rem;}
.uno-card.big .uno-val{font-size:1.8rem;}
.uno-corner{position:absolute;font-family:var(--font-d);font-weight:900;color:#fff;font-size:.7rem;text-shadow:0 1px 2px rgba(0,0,0,.4);}
.uno-corner.tl{top:3px;left:5px;} .uno-corner.br{bottom:3px;right:5px;transform:rotate(180deg);}

.uno-actions{display:flex;gap:.5rem;justify-content:center;min-height:40px;align-items:center;}
.uno-btn{border:none;border-radius:999px;padding:.5rem 1.1rem;font-weight:800;font-size:.9rem;cursor:pointer;font-family:var(--font-b);}
.uno-btn-primary{color:#fff;background:linear-gradient(135deg,var(--primary),var(--accent));box-shadow:var(--shadow);}
.uno-btn-ghost{background:var(--surface-1);color:var(--text);border:1px solid var(--border);}
.uno-btn-uno{color:#fff;background:linear-gradient(135deg,#e0403f,#f4c430);box-shadow:0 6px 18px rgba(224,64,63,.5);font-family:var(--font-d);letter-spacing:.05em;animation:unoPulse 1s ease-in-out infinite;}
@keyframes unoPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.08)}}

.uno-hand{display:flex;justify-content:center;gap:2px;flex-wrap:wrap;padding:.3rem;min-height:90px;}
.uno-hand-card{margin:0 -6px;}

.uno-log{text-align:center;margin-top:.3rem;}
.uno-log-row{font-size:.76rem;color:var(--muted);}

.uno-start{max-width:420px;margin:1rem auto;text-align:center;padding:0 1rem;}
.uno-start-badge{font-size:3rem;}
.uno-start-title{font-family:var(--font-d);font-size:1.8rem;margin:.3rem 0;}
.uno-start-sub{color:var(--muted);font-size:.95rem;margin-bottom:1rem;}
.uno-mini-row{display:flex;gap:.4rem;justify-content:center;margin-bottom:1rem;}
.uno-mini{width:34px;height:48px;border-radius:7px;box-shadow:var(--shadow),inset 0 0 0 2px rgba(255,255,255,.8);}
.uno-btn-primary.uno-btn{padding:.8rem 1.6rem;font-size:1rem;}
.uno-hint{color:var(--muted);font-size:.85rem;margin-top:.7rem;} .uno-hint.uno-warn{color:var(--danger);}

.uno-color-overlay{position:fixed;inset:0;z-index:60;display:grid;place-items:center;background:rgba(10,10,25,.55);backdrop-filter:blur(4px);padding:1rem;}
.uno-color-card{background:var(--surface-1);border:1px solid var(--border);border-radius:18px;padding:1.1rem;box-shadow:var(--shadow-lg);max-width:340px;width:100%;}
.uno-color-title{font-family:var(--font-d);text-align:center;margin-bottom:.7rem;color:var(--text);}
.uno-color-grid{display:grid;grid-template-columns:1fr 1fr;gap:.6rem;}
.uno-color-btn{border:none;border-radius:12px;padding:1rem;color:#fff;font-weight:900;font-size:1rem;cursor:pointer;box-shadow:inset 0 0 0 3px rgba(255,255,255,.4);}
`;
