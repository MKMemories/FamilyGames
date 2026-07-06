import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { dbRef, update } from "../../lib/firebase";
import { fx } from "../../lib/sound";
import { useSoloAI } from "../../hooks/useSoloAI";
import { BOARD, TOKENS, START_MONEY, MAX_HOUSES, type Space } from "../../lib/monopolyData";
import {
  initMono, rollDice, buyProperty, declineBuy, buildHouse, endTurn, currentId, ownsFullSet, aiTurn,
  type MonoState,
} from "../../lib/monopolyEngine";
import type { Room } from "../../types";

interface Props {
  room: Room; roomId: string; playerId: string; isHost: boolean; isSolo: boolean;
  onLeave: () => void; onToast: (m: string) => void;
}
const shuffle = <T,>(a: T[]): T[] => { const r = [...a]; for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; };

/* Dé à pips (grille 3×3) qui culbute au lancer. */
const PIPS: Record<number, number[]> = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
function Die({ v, rolling, dir }: { v: number; rolling: boolean; dir: number }) {
  return (
    <motion.div className="mono-die"
      animate={rolling ? { rotate: [0, dir * 380], scale: [1, 1.18, 1], y: [0, -10, 0] } : { rotate: 0, scale: 1, y: 0 }}
      transition={{ duration: 0.55, ease: "easeInOut" }}>
      {Array.from({ length: 9 }).map((_, i) => <span key={i} className={`mono-pip ${PIPS[v]?.includes(i) ? "on" : ""}`} />)}
    </motion.div>
  );
}

/* Carte « Titre de propriété » présentée au moment de l'achat. */
function TitleDeed({ sp }: { sp: Space }) {
  const band = sp.color || (sp.type === "rail" ? "#2b2f3a" : sp.type === "util" ? "#8b93a7" : "#6b7280");
  return (
    <motion.div className="mono-deed" initial={{ scale: 0.7, y: 12, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
      <div className="mono-deed-band" style={{ background: band }}>TITRE DE PROPRIÉTÉ</div>
      <div className="mono-deed-name">{sp.type === "rail" ? "🚉 " : sp.type === "util" ? "💡 " : ""}{sp.name}</div>
      <div className="mono-deed-price">{sp.price} €</div>
      {sp.rent
        ? <div className="mono-deed-rent">Loyer de base <b>{sp.rent[0]} €</b> · Maison {sp.house} €</div>
        : sp.type === "rail" ? <div className="mono-deed-rent">Loyer selon le nombre de gares</div>
        : <div className="mono-deed-rent">Loyer = dés × 4 ou × 10</div>}
    </motion.div>
  );
}

/* index de case → cellule (ligne, colonne) sur une grille 11×11 (bord). */
function cellPos(i: number): [number, number] {
  if (i === 0) return [10, 10];
  if (i < 10) return [10, 10 - i];
  if (i === 10) return [10, 0];
  if (i < 20) return [20 - i, 0];
  if (i === 20) return [0, 0];
  if (i < 30) return [0, i - 20];
  if (i === 30) return [0, 10];
  return [i - 30, 10];
}

export function Monopoly({ room, roomId, playerId, isHost, isSolo, onLeave, onToast }: Props) {
  const players = Object.values(room.players || {});
  // Firebase supprime les objets vides → on redonne owners/houses par défaut,
  // sinon mono.owners[...] planterait (écran blanc au démarrage).
  const monoRaw = room.mono as MonoState | null;
  const mono: MonoState | null = monoRaw
    ? { ...monoRaw, owners: monoRaw.owners || {}, houses: monoRaw.houses || {} }
    : null;
  const nameOf = (id: string) => (room.players || {})[id]?.name || "Joueur";
  const tokenOf = (id: string) => { const idx = (mono?.order || []).indexOf(id); return TOKENS[idx % TOKENS.length]; };
  const [rolling, setRolling] = useState(false);

  const cur = mono ? currentId(mono) : "";
  const isMyTurn = cur === playerId;
  const me = mono?.players[playerId];

  /* ── Écriture d'un nouvel état (gère la fin de partie → ResultScreen). ── */
  const write = (m: MonoState) => {
    const upd: Record<string, unknown> = { mono: m };
    if (m.phase === "over") {
      const scores: Record<string, number> = {};
      m.order.forEach(id => { scores[id] = m.players[id].bankrupt ? 0 : m.players[id].money; });
      upd.status = "finished"; upd.winner = nameOf(m.winner || m.order[0]); upd.scores = scores;
    }
    update(dbRef(`games/${roomId}`), upd);
  };

  const startGame = () => {
    if (players.length < 2) { onToast("Il faut au moins 2 joueurs"); return; }
    update(dbRef(`games/${roomId}`), { mono: initMono(shuffle(players.map(p => p.id)), Math.random) });
  };

  const doRoll = () => {
    if (!mono || !isMyTurn) return;
    setRolling(true); fx("tap");
    setTimeout(() => {
      setRolling(false);
      const m = rollDice(mono, Math.random);
      fx(m.players[cur].jail >= 0 ? "warn" : "place");
      write(m);
    }, 550);
  };
  const doBuy = () => { if (mono) { fx("point"); write(buyProperty(mono)); } };
  const doDecline = () => { if (mono) write(declineBuy(mono)); };
  const doBuild = (i: number) => { if (mono) { fx("place"); write(buildHouse(mono, i)); } };
  const doEnd = () => { if (mono) { fx("select"); write(endTurn(mono)); } };

  /* ── IA (solo) : joue le tour complet du bot. ── */
  const aiId = room.aiId;
  const aiActive = !!aiId && !!mono && mono.phase !== "over" && cur === aiId && isHost;
  useSoloAI(aiActive, `${mono?.turn}-${mono?.phase}`, () => {
    if (!mono || !aiId) return;
    write(aiTurn(mono, Math.random));
  }, 900);

  /* ── Écran de démarrage ── */
  if (!mono) {
    return (
      <div className="screen game-screen mono-screen">
        <div className="game-topbar"><button className="btn-back" onClick={onLeave}>✕</button><div className="turn-indicator">🏦 Monopoly KHELIJ</div><div /></div>
        <div className="mono-start">
          <div className="mono-start-badge">🏦</div>
          <h1 className="mono-start-title">Monopoly KHELIJ</h1>
          <p className="mono-start-sub">Lance les dés, achète des quartiers, construis des maisons et des hôtels, encaisse les loyers… et ruine toute la famille ! Dernier non-ruiné gagne.</p>
          <div className="mono-start-players">{players.map((p, i) => <span key={p.id} className="mono-chip">{TOKENS[i % TOKENS.length]}</span>)}</div>
          {isHost ? <button className="mono-btn mono-btn-primary" onClick={startGame}>Distribuer 1500 & commencer →</button>
                  : <div className="mono-hint">⏳ En attente de l'hôte…</div>}
          {players.length < 2 && <div className="mono-hint mono-warn">Il faut au moins 2 joueurs</div>}
        </div>
        <style>{MONO_CSS}</style>
      </div>
    );
  }

  const over = mono.phase === "over";
  const curSpace = BOARD[mono.players[cur]?.pos ?? 0];
  const buildable: Space[] = isMyTurn && mono.phase === "manage"
    ? BOARD.filter(sp => sp.type === "prop" && mono.owners[sp.i] === playerId && ownsFullSet(mono, playerId, sp.group!) && (mono.houses[sp.i] || 0) < MAX_HOUSES && (me?.money || 0) >= (sp.house || 0))
    : [];

  return (
    <div className="screen game-screen mono-screen">
      <div className="game-topbar">
        <button className="btn-back" onClick={onLeave}>✕</button>
        <div className="turn-indicator" style={{ background: isMyTurn && !over ? "rgba(36,178,107,.18)" : "rgba(0,0,0,.05)" }}>
          {over ? "🏁 Terminé" : isMyTurn ? "🟢 Ton tour !" : `⏳ ${nameOf(cur)}`}
        </div>
        <div />
      </div>

      {/* Portefeuilles */}
      <div className="mono-wallets">
        {mono.order.map(id => (
          <div key={id} className={`mono-wallet ${id === cur && !over ? "cur" : ""} ${mono.players[id].bankrupt ? "bust" : ""}`}>
            <span className="mono-wtok">{tokenOf(id)}</span>
            <span className="mono-wname">{nameOf(id).slice(0, 6)}</span>
            <motion.span className="mono-wmoney" key={mono.players[id].money} initial={{ scale: 1.35, color: "#f4c430" }} animate={{ scale: 1, color: "var(--green)" }} transition={{ duration: 0.4 }}>
              {mono.players[id].bankrupt ? "✖" : `${mono.players[id].money} €`}
            </motion.span>
          </div>
        ))}
      </div>

      {/* Plateau */}
      <div className="mono-board-wrap">
        <div className="mono-board">
          {BOARD.map(sp => {
            const [r, c] = cellPos(sp.i);
            const here = mono.order.filter(id => mono.players[id].pos === sp.i && !mono.players[id].bankrupt);
            const owner = mono.owners[sp.i];
            const h = mono.houses[sp.i] || 0;
            return (
              <div key={sp.i} className={`mono-cell ${sp.i === (mono.players[cur]?.pos) ? "active" : ""}`}
                style={{ gridRow: r + 1, gridColumn: c + 1 }}>
                {sp.color && <span className="mono-band" style={{ background: sp.color }} />}
                <span className="mono-cname">{sp.type === "go" ? "🏁" : sp.type === "jail" ? "🔒" : sp.type === "gotojail" ? "🚔" : sp.type === "parking" ? "🅿️" : sp.type === "chance" ? "❓" : sp.type === "chest" ? "🎁" : sp.type === "tax" ? "💸" : sp.type === "rail" ? "🚉" : sp.type === "util" ? "💡" : sp.short}</span>
                {owner && <span className="mono-owner" style={{ background: (room.players || {})[owner]?.color || "#999" }} />}
                {h > 0 && <span className="mono-houses">{h === MAX_HOUSES ? "🏨" : "🏠".repeat(h)}</span>}
                {here.length > 0 && <span className="mono-pawns">{here.map(id => (
                  <motion.span key={id} className="mono-pawn" style={{ background: (room.players || {})[id]?.color || "#888" }}
                    initial={{ scale: 0, y: -9 }} animate={{ scale: 1, y: 0 }} transition={{ type: "spring", stiffness: 520, damping: 14 }}>
                    {tokenOf(id)}
                  </motion.span>
                ))}</span>}
              </div>
            );
          })}

          {/* Panneau central */}
          <div className="mono-center">
            <div className="mono-center-deco" aria-hidden>
              <span className="mono-center-glow" />
              <span className="mono-logo-diamond"><span>MONOPOLY</span><small>KHELIJ</small></span>
              <span className="mono-deck chance"><i>❓</i><span>Chance</span></span>
              <span className="mono-deck chest"><i>🎁</i><span>Caisse</span></span>
              <span className="mono-euro e1">€</span><span className="mono-euro e2">€</span>
            </div>
            <div className="mono-dice">
              <Die v={mono.dice[0] || 1} rolling={rolling} dir={1} />
              <Die v={mono.dice[1] || 1} rolling={rolling} dir={-1} />
            </div>
            {mono.card && (
              <motion.div className="mono-drawncard" key={mono.card} initial={{ rotateY: 90, opacity: 0, y: 6 }} animate={{ rotateY: 0, opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
                <span className="mono-dc-head">🎴 Carte</span>
                <span className="mono-dc-text">{mono.card}</span>
              </motion.div>
            )}
            {!over && (
              mono.phase === "buy" && mono.pendingBuy != null
                ? <TitleDeed sp={BOARD[mono.pendingBuy]} />
                : <div className="mono-prompt">
                    {isMyTurn ? <b>{mono.players[playerId].jail >= 0 && mono.phase === "roll" ? "🔒 En prison" : curSpace.short}</b>
                              : <span className="mono-muted">{nameOf(cur)} joue…</span>}
                  </div>
            )}
            {over && <div className="mono-prompt mono-win">🏆 {nameOf(mono.winner || mono.order[0])} gagne !</div>}

            {/* Actions du joueur courant */}
            {isMyTurn && !over && (
              <div className="mono-actions">
                {mono.phase === "roll" && <button className="mono-btn mono-btn-primary" onClick={doRoll} disabled={rolling}>🎲 Lancer</button>}
                {mono.phase === "buy" && (
                  <>
                    <button className="mono-btn mono-btn-primary" onClick={doBuy} disabled={(me?.money || 0) < (BOARD[mono.pendingBuy!].price || 0)}>Acheter</button>
                    <button className="mono-btn mono-btn-ghost" onClick={doDecline}>Passer</button>
                  </>
                )}
                {mono.phase === "manage" && (
                  <>
                    {buildable.slice(0, 2).map(sp => (
                      <button key={sp.i} className="mono-btn mono-btn-build" onClick={() => doBuild(sp.i)}>🏠 {sp.short} ({sp.house})</button>
                    ))}
                    <button className="mono-btn mono-btn-primary" onClick={doEnd}>Terminer ✓</button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Journal */}
      <div className="mono-log">
        <AnimatePresence initial={false}>
          {(mono.log || []).slice(-3).map((l, i) => (
            <motion.div key={`${i}-${l}`} className="mono-log-row" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>{l.replace(/\bA\b|\bB\b|\bC\b|\bD\b/g, m => m)}</motion.div>
          ))}
        </AnimatePresence>
      </div>

      <style>{MONO_CSS}</style>
    </div>
  );
}

const MONO_CSS = `
.mono-screen{max-width:600px;margin:0 auto;}
.mono-wallets{display:flex;gap:.4rem;flex-wrap:wrap;justify-content:center;margin:.2rem 0 .4rem;}
.mono-wallet{display:flex;align-items:center;gap:.3rem;font-size:.78rem;font-weight:800;padding:.25rem .55rem;border-radius:999px;background:var(--surface-1);border:1.5px solid var(--border);color:var(--text);}
.mono-wallet.cur{box-shadow:0 0 0 2px rgba(var(--accent-rgb),.35);}
.mono-wallet.bust{opacity:.45;text-decoration:line-through;}
.mono-wtok{font-size:1rem;} .mono-wmoney{color:var(--green);font-family:var(--font-d);}

.mono-board-wrap{display:flex;justify-content:center;}
.mono-board{position:relative;display:grid;grid-template-columns:repeat(11,1fr);grid-template-rows:repeat(11,1fr);
  gap:1px;width:min(96vw,540px);aspect-ratio:1;padding:9px;border-radius:18px;
  background:
    radial-gradient(120% 120% at 50% 0%, rgba(255,255,255,.35), transparent 40%),
    linear-gradient(160deg,#e6f2ea,#bcdcc8 60%,#a9d0b9);
  box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.5),inset 0 2px 6px rgba(40,90,60,.2),0 18px 40px rgba(20,60,40,.28);}
.mono-cell{position:relative;background:linear-gradient(180deg,#fdfefb,#f2f6ef);border-radius:3px;overflow:hidden;display:flex;flex-direction:column;
  align-items:center;justify-content:center;font-size:clamp(.34rem,1.5vw,.56rem);text-align:center;padding:1px;color:#26332c;
  box-shadow:inset 0 0 0 .5px rgba(40,80,55,.1),0 1px 1px rgba(0,0,0,.04);}
.mono-cell.active{z-index:3;box-shadow:inset 0 0 0 2px var(--accent),0 0 12px color-mix(in srgb,var(--accent) 55%,transparent);animation:monoActive 1.2s ease-in-out infinite;}
@keyframes monoActive{0%,100%{box-shadow:inset 0 0 0 2px var(--accent),0 0 8px color-mix(in srgb,var(--accent) 40%,transparent);}50%{box-shadow:inset 0 0 0 2px var(--accent),0 0 18px 3px color-mix(in srgb,var(--accent) 65%,transparent);}}
@media (prefers-reduced-motion: reduce){.mono-cell.active{animation:none;}}
.mono-band{position:absolute;top:0;left:0;right:0;height:22%;box-shadow:inset 0 -1px 2px rgba(0,0,0,.15);}
.mono-cname{margin-top:18%;font-weight:700;line-height:1;overflow:hidden;}
.mono-owner{position:absolute;bottom:1px;left:1px;width:6px;height:6px;border-radius:50%;box-shadow:0 0 0 1px rgba(255,255,255,.7),0 1px 2px rgba(0,0,0,.3);}
.mono-houses{position:absolute;top:22%;left:0;right:0;font-size:.5em;line-height:1;}
.mono-pawns{position:absolute;bottom:1px;left:0;right:0;display:flex;justify-content:center;align-items:flex-end;z-index:4;pointer-events:none;}
.mono-pawn{width:clamp(13px,4.6vw,18px);height:clamp(13px,4.6vw,18px);border-radius:50%;display:grid;place-items:center;
  font-size:clamp(8px,3vw,11px);line-height:1;border:1.5px solid #fff;box-shadow:0 2px 5px rgba(0,0,0,.5);margin:0 -3px;}

.mono-center{grid-row:2 / 11;grid-column:2 / 11;position:relative;overflow:hidden;border-radius:12px;
  background:radial-gradient(130% 110% at 50% 0%, color-mix(in srgb,var(--accent) 12%, var(--surface-1)), var(--surface-1));
  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.45rem;padding:.7rem;text-align:center;
  box-shadow:inset 0 0 0 1px var(--border),inset 0 2px 12px rgba(0,0,0,.06);}
.mono-center>*:not(.mono-center-deco){position:relative;z-index:1;}
.mono-center-deco{position:absolute;inset:0;display:grid;place-items:center;pointer-events:none;z-index:0;}
.mono-center-glow{position:absolute;width:70%;height:45%;border-radius:50%;background:radial-gradient(circle, color-mix(in srgb,var(--accent) 40%,transparent),transparent 70%);filter:blur(24px);opacity:.6;animation:monoGlow 4s ease-in-out infinite;}
@keyframes monoGlow{0%,100%{opacity:.4;transform:scale(1);}50%{opacity:.7;transform:scale(1.12);}}
.mono-logo-diamond{transform:rotate(-45deg);display:flex;flex-direction:column;align-items:center;gap:1px;
  padding:1.3rem 1.5rem;border:3px solid color-mix(in srgb,var(--primary) 45%,transparent);border-radius:10px;opacity:.13;}
.mono-logo-diamond span{font-family:var(--font-d);font-size:clamp(.9rem,4vw,1.4rem);letter-spacing:.04em;color:var(--primary);white-space:nowrap;line-height:1;}
.mono-logo-diamond small{font-family:var(--font-d);font-size:.72rem;color:var(--accent);}
@media (prefers-reduced-motion: reduce){.mono-center-glow{animation:none;}}
.mono-dice{display:flex;gap:.7rem;line-height:1;}
.mono-die{width:clamp(38px,11vw,52px);aspect-ratio:1;display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(3,1fr);gap:1px;padding:15%;
  background:linear-gradient(150deg,#ffffff,#e7ecf2);border-radius:24%;
  box-shadow:0 6px 14px rgba(0,0,0,.32),inset 0 2px 3px rgba(255,255,255,.95),inset 0 -3px 6px rgba(0,0,0,.14);}
.mono-pip{border-radius:50%;}
.mono-pip.on{background:radial-gradient(circle at 35% 32%,#464b59,#0f1119);box-shadow:inset 0 1px 1px rgba(255,255,255,.25),0 1px 1px rgba(0,0,0,.2);}

/* Decks décoratifs Chance / Caisse dans le tapis */
.mono-deck{position:absolute;display:flex;flex-direction:column;align-items:center;gap:0;padding:.32rem .5rem;border-radius:8px;
  background:linear-gradient(160deg,#ffffff,#eef1fb);box-shadow:0 4px 10px rgba(0,0,0,.22);opacity:.92;}
.mono-deck i{font-size:1.15rem;font-style:normal;line-height:1;}
.mono-deck span{font-family:var(--font-d);font-size:.48rem;color:#5a5f72;letter-spacing:.03em;}
.mono-deck::before,.mono-deck::after{content:'';position:absolute;inset:0;border-radius:8px;background:linear-gradient(160deg,#f4f6ff,#dfe4f4);z-index:-1;}
.mono-deck::before{transform:translate(2.5px,2.5px);} .mono-deck::after{transform:translate(5px,5px);opacity:.8;}
.mono-deck.chance{top:11%;right:9%;transform:rotate(7deg);}
.mono-deck.chest{bottom:13%;left:9%;transform:rotate(-7deg);}
.mono-euro{position:absolute;font-family:var(--font-d);color:color-mix(in srgb,var(--green) 60%, transparent);opacity:.14;font-size:2.2rem;}
.mono-euro.e1{top:14%;left:14%;transform:rotate(-12deg);} .mono-euro.e2{bottom:16%;right:13%;transform:rotate(10deg);}

/* Carte tirée (Chance / Caisse) */
.mono-drawncard{display:flex;flex-direction:column;align-items:center;gap:.1rem;max-width:88%;padding:.4rem .75rem;border-radius:10px;
  background:linear-gradient(160deg,#fffef4,#fff2d2);border:1.5px solid #f0d48a;box-shadow:0 8px 18px rgba(120,90,0,.25);transform-style:preserve-3d;}
.mono-dc-head{font-family:var(--font-d);font-size:.64rem;color:#b8860b;letter-spacing:.05em;}
.mono-dc-text{font-size:.74rem;font-weight:800;color:#3a2f10;line-height:1.2;text-align:center;}

/* Carte « Titre de propriété » à l'achat */
.mono-deed{width:min(74%,196px);background:#fff;border-radius:9px;overflow:hidden;border:1px solid rgba(0,0,0,.12);box-shadow:0 10px 24px rgba(0,0,0,.3);}
.mono-deed-band{color:#fff;font-family:var(--font-d);font-size:.58rem;letter-spacing:.06em;padding:.35rem;text-align:center;text-shadow:0 1px 2px rgba(0,0,0,.35);}
.mono-deed-name{font-weight:900;color:#1c2333;font-size:.92rem;text-align:center;padding:.3rem .3rem 0;line-height:1.05;}
.mono-deed-price{font-family:var(--font-d);color:#189a5b;font-size:1.05rem;text-align:center;padding:.05rem 0 .1rem;}
.mono-deed-rent{font-size:.6rem;color:#5a6274;text-align:center;padding:0 .35rem .4rem;line-height:1.3;}
.mono-deed-rent b{color:#1c2333;}
.mono-card{font-size:.72rem;color:var(--muted);max-width:90%;line-height:1.2;background:var(--surface-2,rgba(0,0,0,.04));padding:.3rem .5rem;border-radius:8px;}
.mono-prompt{font-size:.9rem;font-weight:800;color:var(--text);}
.mono-prompt.mono-win{font-family:var(--font-d);color:var(--accent);font-size:1.05rem;}
.mono-muted{color:var(--muted);font-weight:600;}
.mono-actions{display:flex;gap:.35rem;flex-wrap:wrap;justify-content:center;}
.mono-btn{border:none;border-radius:999px;padding:.5rem .9rem;font-weight:800;font-size:.82rem;cursor:pointer;font-family:var(--font-b);}
.mono-btn-primary{color:#fff;background:linear-gradient(135deg,var(--primary),var(--accent));box-shadow:var(--shadow);}
.mono-btn-primary:disabled{opacity:.5;cursor:default;}
.mono-btn-ghost{background:var(--surface-1);color:var(--text);border:1px solid var(--border);}
.mono-btn-build{background:color-mix(in srgb,var(--green) 18%,var(--surface-1));color:var(--green);border:1px solid color-mix(in srgb,var(--green) 40%,transparent);font-size:.74rem;}

.mono-log{max-width:420px;margin:.4rem auto 0;width:calc(100% - 1.4rem);}
.mono-log-row{font-size:.78rem;color:var(--muted);padding:.12rem 0;text-align:center;}

.mono-start{max-width:420px;margin:1rem auto;text-align:center;padding:0 1rem;}
.mono-start-badge{font-size:3rem;}
.mono-start-title{font-family:var(--font-d);font-size:1.8rem;margin:.3rem 0;}
.mono-start-sub{color:var(--muted);font-size:.95rem;margin-bottom:1rem;}
.mono-start-players{display:flex;gap:.4rem;justify-content:center;margin-bottom:1rem;}
.mono-chip{width:40px;height:40px;border-radius:50%;display:grid;place-items:center;font-size:1.4rem;background:var(--surface-1);box-shadow:var(--shadow);}
.mono-btn-primary.mono-btn{padding:.8rem 1.5rem;font-size:1rem;}
.mono-hint{color:var(--muted);font-size:.85rem;margin-top:.7rem;} .mono-hint.mono-warn{color:var(--danger);}
`;
