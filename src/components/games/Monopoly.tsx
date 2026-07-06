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
const DIE = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];

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
  const mono = room.mono as MonoState | null;
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
            <span className="mono-wmoney">{mono.players[id].bankrupt ? "✖" : `${mono.players[id].money} €`}</span>
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
                {here.length > 0 && <span className="mono-tokens">{here.map(id => <span key={id}>{tokenOf(id)}</span>)}</span>}
              </div>
            );
          })}

          {/* Panneau central */}
          <div className="mono-center">
            <div className="mono-dice">
              <motion.span animate={rolling ? { rotate: [0, 360] } : {}} transition={{ duration: 0.5 }}>{DIE[(mono.dice[0] || 1) - 1]}</motion.span>
              <motion.span animate={rolling ? { rotate: [0, -360] } : {}} transition={{ duration: 0.5 }}>{DIE[(mono.dice[1] || 1) - 1]}</motion.span>
            </div>
            {mono.card && <div className="mono-card">🃏 {mono.card}</div>}
            {!over && (
              <div className="mono-prompt">
                {mono.phase === "buy" && mono.pendingBuy != null
                  ? <b>{BOARD[mono.pendingBuy].short} — {BOARD[mono.pendingBuy].price} €</b>
                  : isMyTurn ? <b>{mono.players[playerId].jail >= 0 && mono.phase === "roll" ? "🔒 En prison" : curSpace.short}</b>
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
  gap:1px;width:min(96vw,540px);aspect-ratio:1;padding:7px;border-radius:16px;
  background:linear-gradient(160deg,#dfeee4,#c4e0cf);box-shadow:inset 0 1px 2px rgba(40,90,60,.18),0 14px 34px rgba(0,0,0,.2);}
.mono-cell{position:relative;background:#f7faf6;border-radius:2.5px;overflow:hidden;display:flex;flex-direction:column;
  align-items:center;justify-content:center;font-size:clamp(.34rem,1.5vw,.56rem);text-align:center;padding:1px;color:#26332c;
  box-shadow:inset 0 0 0 .5px rgba(40,80,55,.08);}
.mono-cell.active{box-shadow:inset 0 0 0 2px var(--accent);}
.mono-band{position:absolute;top:0;left:0;right:0;height:22%;}
.mono-cname{margin-top:18%;font-weight:700;line-height:1;overflow:hidden;}
.mono-owner{position:absolute;bottom:1px;left:1px;width:5px;height:5px;border-radius:50%;}
.mono-houses{position:absolute;top:22%;left:0;right:0;font-size:.5em;line-height:1;}
.mono-tokens{position:absolute;bottom:0;right:0;display:flex;flex-wrap:wrap;justify-content:flex-end;font-size:clamp(.5rem,2vw,.8rem);line-height:.9;}

.mono-center{grid-row:2 / 11;grid-column:2 / 11;background:linear-gradient(160deg,var(--surface-1),var(--surface-2,var(--surface-1)));
  border-radius:10px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.4rem;padding:.6rem;text-align:center;}
.mono-dice{display:flex;gap:.4rem;font-size:clamp(1.6rem,7vw,2.6rem);line-height:1;color:var(--text);}
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
