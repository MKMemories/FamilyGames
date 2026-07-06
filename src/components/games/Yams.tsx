import { useEffect } from "react";
import { motion } from "framer-motion";
import { dbRef, update } from "../../lib/firebase";
import { fx } from "../../lib/sound";
import { useSoloAI } from "../../hooks/useSoloAI";
import {
  YAM_CATS, UPPER_BONUS, UPPER_TARGET, scoreFor, upperSum, totalScore, sheetComplete,
  rollDice, aiHolds, aiPickCategory,
} from "../../lib/yamsData";
import type { Room } from "../../types";

interface Props { room: Room; roomId: string; playerId: string; isHost: boolean; isSolo: boolean; onLeave: () => void; }

const RESET_HELD = [false, false, false, false, false];
const PIPS: Record<number, number[]> = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
const shuffle = <T,>(a: T[]): T[] => { const r = [...a]; for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; };

function DiceFace({ v, held, idx, rolls, onClick, disabled }: { v: number; held: boolean; idx: number; rolls: number; onClick: () => void; disabled: boolean }) {
  return (
    <motion.button
      key={held ? `d${idx}-h` : `d${idx}-r${rolls}`}
      className={`ym-die ${held ? "held" : ""}`}
      onClick={onClick} disabled={disabled}
      initial={held ? false : { rotate: -14, scale: 0.7, opacity: 0 }}
      animate={{ rotate: 0, scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 420, damping: 16, delay: held ? 0 : idx * 0.05 }}
      whileTap={disabled ? {} : { scale: 0.9 }}
    >
      {Array.from({ length: 9 }).map((_, i) => <span key={i} className={`ym-pip ${PIPS[v]?.includes(i) ? "on" : ""}`} />)}
      {held && <span className="ym-lock">🔒</span>}
    </motion.button>
  );
}

export function Yams({ room, roomId, playerId, isHost, isSolo, onLeave }: Props) {
  const players = Object.values(room.players || {});
  const order = room.ymOrder ?? [];
  const turn = room.ymTurn ?? 0;
  const dice = room.ymDice ?? null;
  const held = room.ymHeld ?? RESET_HELD;
  const rolls = room.ymRolls ?? 0;
  const scores = room.ymScores ?? {};
  const aiId = room.aiId;
  const cur = order[turn] || "";
  const isMyTurn = cur === playerId;
  const over = room.status === "finished";
  const path = `games/${roomId}`;
  const nameOf = (id: string) => (id === aiId ? "🤖 Ordi" : (room.players || {})[id]?.name || "Joueur");

  /* Hôte : fixe l'ordre de jeu au démarrage. */
  useEffect(() => {
    if (!isHost || order.length > 0 || players.length === 0) return;
    update(dbRef(path), { ymOrder: shuffle(players.map(p => p.id)), ymTurn: 0, ymDice: null, ymHeld: RESET_HELD, ymRolls: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, order.length, players.length]);

  const canRoll = isMyTurn && !over && rolls < 3;
  const canHold = isMyTurn && !over && !!dice && rolls >= 1 && rolls < 3;

  const roll = () => {
    if (!canRoll) return;
    fx("place");
    update(dbRef(path), { ymDice: rollDice(dice, held), ymRolls: rolls + 1, ...(rolls === 0 ? { ymHeld: RESET_HELD } : {}) });
  };

  const toggleHold = (i: number) => {
    if (!canHold) return;
    fx("tap");
    const h = [...held]; h[i] = !h[i];
    update(dbRef(path), { ymHeld: h });
  };

  const commitScore = (pid: string, catId: string) => {
    const d = dice; if (!d) return;
    const val = scoreFor(catId, d);
    const merged: Record<string, Record<string, number>> = { ...scores, [pid]: { ...(scores[pid] || {}), [catId]: val } };
    const allDone = order.length > 0 && order.every(id => sheetComplete(merged[id]));
    const upd: Record<string, unknown> = {
      [`ymScores/${pid}/${catId}`]: val,
      ymDice: null, ymHeld: RESET_HELD, ymRolls: 0, ymTurn: (turn + 1) % Math.max(order.length, 1),
    };
    if (allDone) {
      const winnerId = [...order].sort((a, b) => totalScore(merged[b]) - totalScore(merged[a]))[0];
      upd.status = "finished"; upd.winner = nameOf(winnerId).replace("🤖 ", "");
    }
    update(dbRef(path), upd);
  };

  const chooseCategory = (catId: string) => {
    if (!isMyTurn || over || !dice || rolls === 0) return;
    if (scores[cur]?.[catId] !== undefined) return;
    fx(scoreFor(catId, dice) > 0 ? "point" : "tap");
    commitScore(cur, catId);
  };

  /* ── IA (solo) : joue tout son tour d'un bloc (3 lancers heuristiques + choix). ── */
  const aiActive = !!aiId && cur === aiId && isHost && !over && order.length > 0;
  useSoloAI(aiActive, `${turn}`, () => {
    if (!aiId) return;
    let d = rollDice(null, RESET_HELD);
    let h = aiHolds(d);
    d = rollDice(d, h);
    h = aiHolds(d);
    d = rollDice(d, h);
    // 1) montre les dés de l'IA
    update(dbRef(path), { ymDice: d, ymHeld: h, ymRolls: 3 });
    // 2) coche la meilleure case et passe la main
    const cat = aiPickCategory(d, scores[aiId] || {});
    setTimeout(() => {
      const val = scoreFor(cat, d);
      const merged: Record<string, Record<string, number>> = { ...scores, [aiId]: { ...(scores[aiId] || {}), [cat]: val } };
      const allDone = order.every(id => sheetComplete(merged[id]));
      const upd: Record<string, unknown> = {
        [`ymScores/${aiId}/${cat}`]: val,
        ymDice: null, ymHeld: RESET_HELD, ymRolls: 0, ymTurn: (turn + 1) % order.length,
      };
      if (allDone) {
        const winnerId = [...order].sort((a, b) => totalScore(merged[b]) - totalScore(merged[a]))[0];
        upd.status = "finished"; upd.winner = nameOf(winnerId).replace("🤖 ", "");
      }
      update(dbRef(path), upd);
    }, 950);
  }, 850);

  const rollLabel = rolls === 0 ? "🎲 Lancer les dés" : rolls < 3 ? `🎲 Relancer (${rolls}/3)` : "Choisis une case ✍️";

  return (
    <div className="screen game-screen ym-screen" style={{ ["--fx" as string]: "#d97706", ["--fx2" as string]: "#fbbf24" }}>
      <span className="fx-aurora" aria-hidden />
      <div className="game-topbar">
        <button className="btn-back" onClick={onLeave}>✕</button>
        <div className="turn-indicator" style={{ background: isMyTurn && !over ? "rgba(217,119,6,.16)" : "rgba(0,0,0,.05)" }}>
          {over ? `🏆 ${room.winner || "Terminé"}` : isMyTurn ? "🟢 À toi de jouer !" : `⏳ ${nameOf(cur)}`}
        </div>
        <div />
      </div>

      {/* Dés */}
      <div className="ym-dice-zone">
        <div className="ym-dice">
          {(dice ?? [1, 2, 3, 4, 5]).map((v, i) => (
            <DiceFace key={i} v={v} held={!!dice && held[i]} idx={i} rolls={rolls}
              onClick={() => toggleHold(i)} disabled={!canHold || !dice} />
          ))}
        </div>
        {!over && (
          <>
            {canRoll ? (
              <button className="ym-roll-btn" onClick={roll} disabled={!canRoll}>{rollLabel}</button>
            ) : (
              <div className="ym-roll-hint">{isMyTurn ? "✍️ Choisis une case à cocher ci-dessous" : `⏳ ${nameOf(cur)} joue…`}</div>
            )}
            {canHold && <div className="ym-hold-tip">👆 Touche un dé pour le garder</div>}
          </>
        )}
      </div>

      {/* Feuille de score */}
      <div className="ym-sheet-wrap">
        <table className="ym-sheet">
          <thead>
            <tr>
              <th className="ym-cat-h">Combinaison</th>
              {order.map(id => (
                <th key={id} className={id === cur && !over ? "cur" : ""} style={{ color: (room.players || {})[id]?.color || "var(--text)" }}>
                  {(room.players || {})[id]?.emoji || (id === aiId ? "🤖" : "👤")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {YAM_CATS.map((c, ci) => (
              <tr key={c.id} className={c.upper ? "up" : "low"}>
                <td className="ym-cat" title={c.hint}>{c.name}{ci === 5 ? <span className="ym-catsub"> · bonus {UPPER_TARGET}→+{UPPER_BONUS}</span> : null}</td>
                {order.map(id => {
                  const filled = scores[id]?.[c.id];
                  const selectable = id === cur && isMyTurn && !over && !!dice && rolls > 0 && filled === undefined;
                  if (filled !== undefined) return <td key={id} className="ym-val filled">{filled}</td>;
                  if (selectable) {
                    const pot = scoreFor(c.id, dice!);
                    return <td key={id} className="ym-val"><button className={`ym-pick ${pot > 0 ? "good" : "zero"}`} onClick={() => chooseCategory(c.id)}>{pot}</button></td>;
                  }
                  return <td key={id} className="ym-val empty">·</td>;
                })}
              </tr>
            ))}
            <tr className="ym-sub">
              <td className="ym-cat">Section haute</td>
              {order.map(id => { const u = upperSum(scores[id] || {}); return <td key={id} className="ym-val"><span className="ym-upprog">{u}{u >= UPPER_TARGET ? " ✅" : `/${UPPER_TARGET}`}</span></td>; })}
            </tr>
            <tr className="ym-total">
              <td className="ym-cat">Total</td>
              {order.map(id => <td key={id} className="ym-val ym-grand">{totalScore(scores[id])}</td>)}
            </tr>
          </tbody>
        </table>
      </div>

      {over && (isHost || isSolo) && (
        <div className="ym-over-note">🏆 Partie terminée — voir le classement sur l'écran suivant.</div>
      )}

      <style>{YM_CSS}</style>
    </div>
  );
}

const YM_CSS = `
.ym-screen{max-width:560px;margin:0 auto;position:relative;}
.ym-dice-zone{display:flex;flex-direction:column;align-items:center;gap:.5rem;margin:.5rem 0 .3rem;}
.ym-dice{display:flex;gap:.5rem;justify-content:center;}
.ym-die{position:relative;width:clamp(44px,12.5vw,58px);height:clamp(44px,12.5vw,58px);display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(3,1fr);
  gap:2px;padding:9px;border-radius:14px;border:none;cursor:pointer;
  background:linear-gradient(150deg,#fffef9,#f2ede1);box-shadow:0 6px 14px rgba(0,0,0,.18),inset 0 2px 0 rgba(255,255,255,.9),inset 0 -3px 6px rgba(0,0,0,.08);}
.ym-die:disabled{cursor:default;}
.ym-die.held{background:linear-gradient(150deg,#fff5d6,#ffe9a8);box-shadow:0 0 0 3px var(--fx),0 6px 16px color-mix(in srgb,var(--fx) 45%,transparent);}
.ym-pip{border-radius:50%;background:transparent;}
.ym-pip.on{background:radial-gradient(circle at 35% 30%,#5a4a2a,#241c0e);box-shadow:inset 0 1px 1px rgba(255,255,255,.3);}
.ym-lock{position:absolute;top:-8px;right:-6px;font-size:.72rem;filter:drop-shadow(0 1px 1px rgba(0,0,0,.3));}

.ym-roll-btn{border:none;border-radius:16px;padding:.7rem 1.4rem;color:#fff;font-family:var(--font-d);font-size:1.1rem;font-weight:900;
  background:linear-gradient(135deg,var(--fx),var(--fx2));box-shadow:0 8px 22px color-mix(in srgb,var(--fx) 45%,transparent);cursor:pointer;transition:transform .12s;}
.ym-roll-btn:active{transform:translateY(2px);}
.ym-roll-btn:disabled{opacity:.5;}
.ym-roll-hint{font-weight:800;color:var(--muted);font-size:.9rem;}
.ym-hold-tip{font-size:.76rem;font-weight:700;color:var(--fx);}

.ym-sheet-wrap{max-width:520px;margin:.3rem auto 0;width:calc(100% - .8rem);overflow-x:auto;}
.ym-sheet{width:100%;border-collapse:collapse;font-size:.86rem;background:var(--surface-1);border-radius:14px;overflow:hidden;box-shadow:var(--shadow);}
.ym-sheet th,.ym-sheet td{padding:.32rem .4rem;text-align:center;border-bottom:1px solid var(--border);}
.ym-sheet thead th{font-size:1.15rem;background:color-mix(in srgb,var(--fx) 12%,var(--surface-2));position:sticky;top:0;}
.ym-sheet thead th.cur{background:color-mix(in srgb,var(--fx) 30%,var(--surface-2));box-shadow:inset 0 -3px 0 var(--fx);}
.ym-cat-h{text-align:left !important;font-size:.78rem !important;font-weight:900;color:var(--muted);}
.ym-cat{text-align:left !important;font-weight:800;color:var(--text);white-space:nowrap;}
.ym-catsub{font-weight:700;font-size:.62rem;color:var(--muted);}
.ym-sheet tr.up .ym-cat{color:color-mix(in srgb,var(--fx) 90%,var(--text));}
.ym-val{font-family:var(--font-d);min-width:34px;}
.ym-val.filled{color:var(--text);font-weight:900;background:color-mix(in srgb,var(--fx) 7%,transparent);}
.ym-val.empty{color:var(--border);}
.ym-pick{border:none;border-radius:8px;padding:.15rem .5rem;font-family:var(--font-d);font-weight:900;font-size:.9rem;cursor:pointer;min-width:30px;transition:transform .1s;}
.ym-pick:active{transform:scale(.9);}
.ym-pick.good{background:linear-gradient(135deg,#22c55e,#16a34a);color:#fff;box-shadow:0 3px 8px rgba(34,197,94,.4);animation:ymPickGlow 1.5s ease-in-out infinite;}
.ym-pick.zero{background:var(--surface-2);color:var(--muted);border:1px dashed var(--border);}
/* Lueur (box-shadow) et non transform : la cible de clic reste parfaitement stable. */
@keyframes ymPickGlow{0%,100%{box-shadow:0 3px 8px rgba(34,197,94,.4)}50%{box-shadow:0 2px 15px rgba(34,197,94,.8)}}
.ym-sheet tr.ym-sub td{background:var(--surface-2);font-weight:800;font-size:.76rem;}
.ym-upprog{color:var(--fx);font-weight:900;}
.ym-sheet tr.ym-total td{background:color-mix(in srgb,var(--fx) 16%,var(--surface-2));}
.ym-grand{font-family:var(--font-d);font-size:1.05rem;font-weight:900;color:var(--fx);}
.ym-over-note{text-align:center;font-weight:800;color:var(--fx);margin:.7rem auto;font-size:.9rem;}
`;
