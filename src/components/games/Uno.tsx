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

  const activeHex = COLOR_HEX[uno.activeColor];
  const throwAngle = ((uno.discard.length * 47) % 60) - 30; // angle de lancer « aléatoire » stable

  return (
    <div className="screen game-screen uno-screen" style={{ ["--uno-active" as string]: activeHex }}>
      {/* Décor : tapis de jeu, halo à la couleur active, particules */}
      <div className="uno-felt" aria-hidden>
        <span className="uno-felt-glow" />
        <span className="uno-felt-vign" />
        {[...Array(9)].map((_, i) => <span key={i} className={`uno-particle p${i}`} />)}
        <span className="uno-felt-mark">UNO</span>
      </div>

      <div className="game-topbar">
        <button className="btn-back" onClick={onLeave}>✕</button>
        <div className="turn-indicator" style={{ background: isMyTurn && !over ? "rgba(36,178,107,.18)" : "rgba(0,0,0,.05)" }}>
          {over ? `🏆 ${nameOf(uno.winner || "")} gagne !` : isMyTurn ? "🟢 Ton tour !" : `⏳ ${nameOf(cur)}`}
        </div>
        <motion.div className="uno-dir" key={uno.dir} animate={{ rotate: uno.dir === 1 ? [0, 360] : [0, -360] }} transition={{ duration: 0.6 }}>
          {uno.dir === 1 ? "⟳" : "⟲"}
        </motion.div>
      </div>

      {/* Adversaires */}
      <div className="uno-opponents">
        {others.map(id => {
          const n = uno.hands[id]?.length || 0;
          const isCur = id === cur && !over;
          return (
            <motion.div key={id} className={`uno-opp ${isCur ? "cur" : ""}`} animate={isCur ? { scale: [1, 1.05, 1] } : { scale: 1 }} transition={{ duration: 1.1, repeat: isCur ? Infinity : 0 }}>
              <span className="uno-opp-name">{id === aiId ? "🤖 Ordi" : nameOf(id).slice(0, 8)}</span>
              <div className="uno-opp-cards">
                {Array.from({ length: Math.min(n, 8) }).map((_, i) => <span key={i} className="uno-back-mini" />)}
              </div>
              <span className={`uno-opp-count ${n === 1 ? "uno1" : ""}`}>{n}{n === 1 ? " · UNO !" : " cartes"}</span>
            </motion.div>
          );
        })}
      </div>

      {/* Table centrale : pioche + défausse posées sur le tapis */}
      <div className="uno-table">
        <span className="uno-table-ring" />
        <div className="uno-center">
          <motion.button className={`uno-draw-pile ${isMyTurn && !over ? "glow" : ""}`} onClick={draw} disabled={!isMyTurn || over} title="Piocher"
            whileTap={{ scale: 0.92 }}>
            <span className="uno-pile-shadow" />
            <span className="uno-back-logo">UNO</span>
            <span className="uno-draw-count">{uno.draw.length}</span>
          </motion.button>

          <div className="uno-discard">
            {/* Épaisseur de la pile (cartes fantômes dessous) */}
            <span className="uno-stack s1" /><span className="uno-stack s2" />
            <AnimatePresence mode="popLayout">
              <motion.div key={uno.discard.length + t.c + t.v} className="uno-thrown"
                initial={{ x: throwAngle, y: -46, scale: 0.5, rotate: throwAngle, opacity: 0 }}
                animate={{ x: 0, y: 0, scale: 1, rotate: 0, opacity: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 18 }}>
                <Card card={t.c === "w" ? { c: uno.activeColor, v: t.v } : t} big />
              </motion.div>
            </AnimatePresence>
            <motion.span className="uno-active-color" style={{ background: activeHex }} title={COLOR_NAME[uno.activeColor]}
              key={uno.activeColor} initial={{ scale: 0 }} animate={{ scale: [0, 1.4, 1] }} transition={{ duration: 0.4 }} />
          </div>
        </div>
      </div>

      {/* Actions contextuelles */}
      <div className="uno-actions">
        {isMyTurn && !over && uno.drewPlayable && <button className="uno-btn uno-btn-ghost" onClick={pass}>Passer</button>}
        {isMyTurn && !over && myHand.length === 2 && !uno.saidUno[playerId] && <button className="uno-btn uno-btn-uno" onClick={sayUno}>UNO !</button>}
      </div>

      {/* Ma main — distribuée en éventail, entrée animée */}
      <div className="uno-hand">
        {myHand.map((card, i) => {
          const canPlay = isMyTurn && !over && playable(uno, playerId, card);
          return (
            <motion.div key={i} className="uno-hand-card" style={{ zIndex: i }}
              initial={{ y: 46, opacity: 0, rotate: -6 }} animate={{ y: 0, opacity: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 380, damping: 26, delay: Math.min(i * 0.035, 0.3) }}
              whileHover={canPlay ? { y: -16, scale: 1.06 } : {}}>
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
.uno-screen{max-width:600px;margin:0 auto;position:relative;overflow:hidden;}
.uno-screen>*{position:relative;z-index:1;}

/* ── Tapis de jeu décoratif ── */
.uno-felt{position:absolute;inset:0;z-index:0;pointer-events:none;overflow:hidden;
  background:
    radial-gradient(120% 80% at 50% 34%, color-mix(in srgb, var(--uno-active) 26%, transparent), transparent 60%),
    radial-gradient(100% 70% at 50% 40%, rgba(12,20,40,.28), transparent 70%);}
.uno-felt-glow{position:absolute;top:20%;left:50%;width:340px;height:340px;transform:translateX(-50%);border-radius:50%;
  background:radial-gradient(circle, color-mix(in srgb, var(--uno-active) 55%, transparent), transparent 66%);
  filter:blur(30px);opacity:.6;animation:unoGlow 3.5s ease-in-out infinite;}
@keyframes unoGlow{0%,100%{opacity:.4;transform:translateX(-50%) scale(1);}50%{opacity:.75;transform:translateX(-50%) scale(1.12);}}
.uno-felt-vign{position:absolute;inset:0;box-shadow:inset 0 0 120px 30px rgba(0,0,0,.35);}
.uno-felt-mark{position:absolute;top:30%;left:50%;transform:translate(-50%,-50%) rotate(-16deg);
  font-family:var(--font-d);font-style:italic;font-size:5rem;color:color-mix(in srgb, var(--uno-active) 40%, #fff);opacity:.06;letter-spacing:.02em;}
.uno-particle{position:absolute;width:8px;height:8px;border-radius:50%;background:color-mix(in srgb, var(--uno-active) 70%, #fff);opacity:.5;
  animation:unoFloat 7s ease-in-out infinite;}
.uno-particle.p0{top:12%;left:14%;animation-delay:0s;background:#e0403f;} .uno-particle.p1{top:22%;left:82%;animation-delay:.7s;background:#f4c430;}
.uno-particle.p2{top:44%;left:8%;animation-delay:1.4s;background:#2fa66a;} .uno-particle.p3{top:60%;left:88%;animation-delay:2.1s;background:#3b6fe0;}
.uno-particle.p4{top:70%;left:20%;animation-delay:2.8s;} .uno-particle.p5{top:16%;left:50%;animation-delay:3.5s;background:#f4c430;}
.uno-particle.p6{top:52%;left:70%;animation-delay:4.2s;background:#e0403f;} .uno-particle.p7{top:80%;left:60%;animation-delay:4.9s;background:#2fa66a;}
.uno-particle.p8{top:36%;left:36%;animation-delay:5.6s;background:#3b6fe0;}
@keyframes unoFloat{0%,100%{transform:translateY(0) scale(1);opacity:.15;}50%{transform:translateY(-22px) scale(1.4);opacity:.6;}}
@media (prefers-reduced-motion: reduce){.uno-felt-glow,.uno-particle{animation:none;}}

.uno-dir{font-size:1.3rem;color:color-mix(in srgb, var(--uno-active) 60%, var(--muted));}
.uno-opponents{display:flex;gap:.5rem;justify-content:center;flex-wrap:wrap;margin:.5rem 0 .2rem;}
.uno-opp{display:flex;flex-direction:column;align-items:center;gap:.15rem;padding:.4rem .7rem;border-radius:14px;
  background:color-mix(in srgb, var(--surface-1) 82%, transparent);border:1.5px solid var(--border);backdrop-filter:blur(6px);}
.uno-opp.cur{border-color:color-mix(in srgb, var(--uno-active) 70%, transparent);box-shadow:0 0 0 2px color-mix(in srgb, var(--uno-active) 45%, transparent),0 6px 18px color-mix(in srgb, var(--uno-active) 30%, transparent);}
.uno-opp-name{font-size:.78rem;font-weight:900;color:var(--text);}
.uno-opp-cards{display:flex;height:16px;align-items:center;}
.uno-back-mini{width:10px;height:15px;border-radius:2px;margin-left:-5px;background:linear-gradient(135deg,#3a3f4d,#141824);border:1px solid rgba(255,255,255,.18);box-shadow:0 1px 2px rgba(0,0,0,.3);}
.uno-opp-count{font-size:.72rem;font-weight:900;color:var(--muted);}
.uno-opp-count.uno1{color:#f4c430;text-shadow:0 0 8px rgba(244,196,48,.6);}

/* ── Table centrale ── */
.uno-table{position:relative;display:flex;justify-content:center;padding:1.1rem 0 .5rem;margin:.2rem 0;}
.uno-table-ring{position:absolute;top:50%;left:50%;width:250px;height:150px;transform:translate(-50%,-46%);border-radius:50%;
  border:2px solid color-mix(in srgb, var(--uno-active) 45%, transparent);
  box-shadow:0 0 40px color-mix(in srgb, var(--uno-active) 35%, transparent),inset 0 0 40px color-mix(in srgb, var(--uno-active) 18%, transparent);
  animation:unoRing 3.5s ease-in-out infinite;}
@keyframes unoRing{0%,100%{transform:translate(-50%,-46%) scale(1);opacity:.7;}50%{transform:translate(-50%,-46%) scale(1.06);opacity:1;}}
@media (prefers-reduced-motion: reduce){.uno-table-ring{animation:none;}}
.uno-center{display:flex;gap:1.6rem;justify-content:center;align-items:center;}
.uno-draw-pile{position:relative;width:68px;height:100px;border-radius:13px;cursor:pointer;border:none;
  background:repeating-linear-gradient(48deg,#2b2f3a 0 8px,#20232d 8px 16px);
  box-shadow:0 10px 24px rgba(0,0,0,.45),inset 0 0 0 3px rgba(255,255,255,.12),inset 0 2px 6px rgba(255,255,255,.08);display:grid;place-items:center;}
.uno-draw-pile:disabled{opacity:.7;cursor:default;}
.uno-draw-pile.glow{animation:unoDrawGlow 1.6s ease-in-out infinite;}
@keyframes unoDrawGlow{0%,100%{box-shadow:0 10px 24px rgba(0,0,0,.45),inset 0 0 0 3px rgba(255,255,255,.12),0 0 0 0 color-mix(in srgb, var(--uno-active) 60%, transparent);}50%{box-shadow:0 10px 24px rgba(0,0,0,.45),inset 0 0 0 3px rgba(255,255,255,.2),0 0 22px 4px color-mix(in srgb, var(--uno-active) 55%, transparent);}}
@media (prefers-reduced-motion: reduce){.uno-draw-pile.glow{animation:none;}}
.uno-pile-shadow{position:absolute;inset:0;border-radius:13px;box-shadow:6px 6px 0 -2px rgba(20,24,36,.7),12px 12px 0 -4px rgba(20,24,36,.5);z-index:-1;}
.uno-back-logo{font-family:var(--font-d);font-style:italic;color:#f4c430;font-size:1.15rem;transform:rotate(-18deg);text-shadow:0 2px 5px rgba(0,0,0,.6);
  background:#e0403f;padding:.15rem .5rem;border-radius:999px/60%;box-shadow:0 2px 6px rgba(0,0,0,.4);}
.uno-draw-count{position:absolute;bottom:5px;right:7px;font-size:.72rem;font-weight:900;color:rgba(255,255,255,.85);}
.uno-discard{position:relative;width:66px;height:96px;}
.uno-thrown{position:absolute;inset:0;}
.uno-stack{position:absolute;width:66px;height:96px;border-radius:11px;background:linear-gradient(135deg,#e8e8ec,#cfcfd6);box-shadow:0 4px 10px rgba(0,0,0,.3);}
.uno-stack.s1{transform:rotate(-8deg) translate(-3px,2px);} .uno-stack.s2{transform:rotate(6deg) translate(3px,1px);}
.uno-active-color{position:absolute;top:-7px;right:-7px;width:20px;height:20px;border-radius:50%;border:2px solid var(--surface-1);z-index:3;
  box-shadow:0 0 12px color-mix(in srgb, var(--uno-active) 80%, transparent),var(--shadow);}

.uno-card{position:relative;width:56px;height:82px;border-radius:11px;border:none;cursor:pointer;padding:0;
  box-shadow:0 5px 12px rgba(0,0,0,.35),inset 0 0 0 3px rgba(255,255,255,.9);overflow:hidden;}
.uno-card::after{content:'';position:absolute;top:0;left:0;right:0;height:45%;border-radius:11px 11px 40% 40%;
  background:linear-gradient(180deg,rgba(255,255,255,.35),transparent);pointer-events:none;}
.uno-card:disabled{cursor:default;}
.uno-card.big{width:66px;height:96px;}
.uno-card.dim{opacity:.4;filter:grayscale(.5);}
.uno-oval{position:absolute;inset:14% 10%;background:#fff;border-radius:50%/40%;transform:rotate(-32deg);display:grid;place-items:center;box-shadow:inset 0 2px 4px rgba(0,0,0,.12);}
.uno-val{transform:rotate(32deg);font-family:var(--font-d);font-weight:900;font-size:1.5rem;}
.uno-card.big .uno-val{font-size:1.8rem;}
.uno-corner{position:absolute;font-family:var(--font-d);font-weight:900;color:#fff;font-size:.72rem;text-shadow:0 1px 2px rgba(0,0,0,.5);}
.uno-corner.tl{top:3px;left:5px;} .uno-corner.br{bottom:3px;right:5px;transform:rotate(180deg);}

.uno-actions{display:flex;gap:.5rem;justify-content:center;min-height:40px;align-items:center;}
.uno-btn{border:none;border-radius:999px;padding:.5rem 1.1rem;font-weight:800;font-size:.9rem;cursor:pointer;font-family:var(--font-b);}
.uno-btn-primary{color:#fff;background:linear-gradient(135deg,var(--primary),var(--accent));box-shadow:var(--shadow);}
.uno-btn-ghost{background:var(--surface-1);color:var(--text);border:1px solid var(--border);}
.uno-btn-uno{color:#fff;background:linear-gradient(135deg,#e0403f,#f4c430);box-shadow:0 6px 18px rgba(224,64,63,.5);font-family:var(--font-d);letter-spacing:.05em;animation:unoPulse 1s ease-in-out infinite;}
@keyframes unoPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.08)}}

.uno-hand{display:flex;justify-content:center;gap:2px;flex-wrap:wrap;padding:.4rem;min-height:100px;}
.uno-hand-card{margin:0 -6px;filter:drop-shadow(0 6px 8px rgba(0,0,0,.28));}

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
