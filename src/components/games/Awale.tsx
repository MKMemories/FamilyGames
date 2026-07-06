import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { dbRef, update } from "../../lib/firebase";
import { fx } from "../../lib/sound";
import { useSoloAI } from "../../hooks/useSoloAI";
import {
  newBoard, applyMove, legalMoves, resolveAfterMove, aiChoose, AW_SEEDS,
} from "../../lib/awaleData";
import type { Room, Difficulty } from "../../types";

interface Props { room: Room; roomId: string; playerId: string; isHost: boolean; isSolo: boolean; onLeave: () => void; }

const TOP = [11, 10, 9, 8, 7, 6];      // rangée haute (siège 1), affichée gauche→droite
const BOTTOM = [0, 1, 2, 3, 4, 5];     // rangée basse (siège 0)
/* Positions des graines dans un trou (dispersion « naturelle »), en %. */
const SEED_POS = [
  [50, 50], [32, 38], [68, 40], [40, 65], [62, 64], [50, 28], [30, 60], [70, 62],
  [48, 46], [58, 34], [36, 52], [64, 50], [44, 70], [56, 70],
];

export function Awale({ room, roomId, playerId, isHost, isSolo, onLeave }: Props) {
  const players = Object.values(room.players || {});
  const board = room.awBoard ?? newBoard();
  const stores = room.awStores ?? [0, 0];
  const turn = (room.awTurn ?? 0) as 0 | 1;
  const order = room.awOrder ?? [];
  const moves = room.awMoves ?? 0;
  const last = room.awLast ?? null;
  const gain = room.awGain ?? 0;
  const aiId = room.aiId;
  const diff: Difficulty = (room.soloDifficulty as Difficulty) || "moyen";
  const over = room.status === "finished";
  const path = `games/${roomId}`;

  const mySeat = (order.indexOf(playerId)) as 0 | 1 | -1;
  const isMyTurn = mySeat === turn && !over;
  const curId = order[turn] || "";
  const nameOf = (id: string) => (id === aiId ? "🤖 Ordi" : (room.players || {})[id]?.name || "Joueur");
  const seatName = (seat: 0 | 1) => nameOf(order[seat] || "");
  const legal = order.length === 2 && !over ? legalMoves(board, turn) : [];

  /* Hôte : place les joueurs (l'IA en siège 1 → l'humain en bas en solo). */
  useEffect(() => {
    if (!isHost || order.length === 2 || players.length < 2) return;
    const ids = players.map(p => p.id);
    const ord = aiId ? [ids.find(i => i !== aiId)!, aiId] : ids.slice(0, 2);
    update(dbRef(path), { awOrder: ord, awTurn: 0, awBoard: newBoard(), awStores: [0, 0], awMoves: 0, awLast: null, awGain: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, order.length, players.length]);

  const doMove = (seat: 0 | 1, pit: number) => {
    if (!legalMoves(board, seat).includes(pit)) return;
    const { board: nb, captured } = applyMove(board, seat, pit);
    const st: [number, number] = [stores[0], stores[1]];
    st[seat] += captured;
    const res = resolveAfterMove(nb, st, seat, moves + 1);
    const upd: Record<string, unknown> = {
      awBoard: res.board, awStores: res.stores, awTurn: res.next, awMoves: moves + 1, awLast: pit, awGain: captured,
    };
    if (res.over) {
      upd.status = "finished";
      const [a, b] = res.stores;
      upd.winner = a === b ? "Égalité 🤝" : nameOf(order[a > b ? 0 : 1]).replace("🤖 ", "");
    }
    fx(captured > 0 ? "point" : "place");
    update(dbRef(path), upd);
  };

  const play = (pit: number) => {
    if (!isMyTurn || mySeat < 0) return;
    doMove(mySeat as 0 | 1, pit);
  };

  /* ── IA (solo) : joue un coup quand c'est son siège. ── */
  const aiSeat = (order.indexOf(aiId || "")) as 0 | 1 | -1;
  const aiActive = !!aiId && aiSeat >= 0 && turn === aiSeat && isHost && !over && order.length === 2;
  useSoloAI(aiActive, `${moves}`, () => {
    if (aiSeat < 0) return;
    const pit = aiChoose(board, [stores[0], stores[1]], aiSeat as 0 | 1, diff);
    if (pit == null) return;
    doMove(aiSeat as 0 | 1, pit);
  }, 750);

  const Pit = ({ i }: { i: number }) => {
    const n = board[i];
    const clickable = isMyTurn && legal.includes(i);
    const mine = mySeat >= 0 && (mySeat === 0 ? i <= 5 : i >= 6);
    const dots = Math.min(n, SEED_POS.length);
    return (
      <button className={`aw-pit ${clickable ? "legal" : ""} ${i === last ? "last" : ""} ${mine ? "mine" : ""}`}
        onClick={() => clickable && play(i)} disabled={!clickable} aria-label={`Trou ${n} graines`}>
        <span className="aw-pit-well">
          <AnimatePresence>
            {Array.from({ length: dots }).map((_, k) => (
              <motion.span key={k} className="aw-seed" style={{ left: `${SEED_POS[k][0]}%`, top: `${SEED_POS[k][1]}%` }}
                initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ duration: 0.18, delay: k * 0.012 }} />
            ))}
          </AnimatePresence>
        </span>
        <span className="aw-count">{n}</span>
      </button>
    );
  };

  return (
    <div className="screen game-screen aw-screen" style={{ ["--fx" as string]: "#b45309", ["--fx2" as string]: "#f59e0b" }}>
      <span className="fx-aurora" aria-hidden />
      <div className="game-topbar">
        <button className="btn-back" onClick={onLeave}>✕</button>
        <div className="turn-indicator" style={{ background: isMyTurn ? "rgba(180,83,9,.16)" : "rgba(0,0,0,.05)" }}>
          {over ? `🏆 ${room.winner || "Terminé"}` : isMyTurn ? "🟢 À toi de semer !" : `⏳ ${nameOf(curId)}`}
        </div>
        <div />
      </div>

      {/* Greniers / score */}
      <div className="aw-scores">
        <div className={`aw-scorechip ${turn === 1 && !over ? "cur" : ""}`}>
          <span className="aw-sc-emoji">{(room.players || {})[order[1]]?.emoji || "🤖"}</span>
          <span className="aw-sc-name">{seatName(1).replace("🤖 ", "")}</span>
          <span className="aw-sc-num">{stores[1]}</span>
        </div>
        <div className="aw-goal">🫘 {AW_SEEDS} graines · {AW_SEEDS / 2 + 1} pour gagner</div>
        <div className={`aw-scorechip ${turn === 0 && !over ? "cur" : ""}`}>
          <span className="aw-sc-emoji">{(room.players || {})[order[0]]?.emoji || "🦊"}</span>
          <span className="aw-sc-name">{seatName(0).replace("🤖 ", "")}</span>
          <span className="aw-sc-num">{stores[0]}</span>
        </div>
      </div>

      {/* Plateau */}
      <div className="aw-board">
        <div className="aw-store"><span className="aw-store-lbl">{seatName(1).replace("🤖 ", "").slice(0, 6)}</span><span className="aw-store-num">{stores[1]}</span></div>
        <div className="aw-mid">
          <div className="aw-row">{TOP.map(i => <Pit key={i} i={i} />)}</div>
          <div className="aw-row">{BOTTOM.map(i => <Pit key={i} i={i} />)}</div>
        </div>
        <div className="aw-store"><span className="aw-store-lbl">{seatName(0).replace("🤖 ", "").slice(0, 6)}</span><span className="aw-store-num">{stores[0]}</span></div>
      </div>

      {/* Feedback dernière capture */}
      <AnimatePresence>
        {gain > 0 && !over && (
          <motion.div key={moves} className="aw-gain" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            +{gain} graine{gain > 1 ? "s" : ""} capturée{gain > 1 ? "s" : ""} par {seatName((last != null && last <= 5 ? 0 : 1) as 0 | 1).replace("🤖 ", "")} 🎉
          </motion.div>
        )}
      </AnimatePresence>

      {!over && (
        <div className="aw-hint">
          {isMyTurn ? "👆 Choisis un de tes trous : les graines se sèment vers la droite, capture les 2 ou 3 chez l'adversaire."
            : `⏳ ${nameOf(curId)} réfléchit…`}
        </div>
      )}
      {over && (isHost || isSolo) && <div className="aw-over-note">🏆 Partie terminée — classement sur l'écran suivant.</div>}

      <style>{AW_CSS}</style>
    </div>
  );
}

const AW_CSS = `
.aw-screen{max-width:560px;margin:0 auto;position:relative;}
.aw-scores{display:flex;align-items:center;justify-content:space-between;gap:.5rem;margin:.5rem auto;max-width:480px;width:calc(100% - 1rem);}
.aw-scorechip{display:flex;align-items:center;gap:.4rem;padding:.35rem .7rem;border-radius:14px;background:var(--surface-1);border:1.5px solid var(--border);}
.aw-scorechip.cur{border-color:color-mix(in srgb,var(--fx) 60%,transparent);box-shadow:0 0 0 2px color-mix(in srgb,var(--fx) 28%,transparent);}
.aw-sc-emoji{font-size:1.1rem;}
.aw-sc-name{font-weight:900;font-size:.82rem;color:var(--text);}
.aw-sc-num{font-family:var(--font-d);font-size:1.15rem;color:var(--fx);}
.aw-goal{font-size:.64rem;font-weight:800;color:var(--muted);text-align:center;line-height:1.2;}

.aw-board{display:flex;align-items:stretch;gap:.4rem;justify-content:center;margin:.3rem auto;max-width:520px;width:calc(100% - .8rem);
  padding:.55rem;border-radius:22px;background:linear-gradient(160deg,#7a4a1e,#5c3514);
  box-shadow:0 14px 34px rgba(90,53,20,.5),inset 0 2px 0 rgba(255,255,255,.14),inset 0 -6px 14px rgba(0,0,0,.32);}
.aw-store{width:48px;flex:none;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.2rem;border-radius:16px;
  background:radial-gradient(circle at 50% 35%,#4a2a10,#33200c);box-shadow:inset 0 3px 10px rgba(0,0,0,.5),inset 0 -1px 0 rgba(255,255,255,.08);}
.aw-store-lbl{font-size:.52rem;font-weight:800;color:rgba(255,240,220,.65);text-align:center;}
.aw-store-num{font-family:var(--font-d);font-size:1.4rem;color:#ffe4b5;}
.aw-mid{flex:1;display:flex;flex-direction:column;gap:.45rem;}
.aw-row{display:grid;grid-template-columns:repeat(6,1fr);gap:.4rem;}
.aw-pit{position:relative;aspect-ratio:1;border:none;padding:0;background:transparent;cursor:default;}
.aw-pit-well{position:absolute;inset:0;border-radius:50%;overflow:hidden;
  background:radial-gradient(circle at 50% 32%,#3a2410,#241608);box-shadow:inset 0 4px 10px rgba(0,0,0,.6),inset 0 -2px 3px rgba(255,255,255,.08);}
.aw-pit.mine .aw-pit-well{background:radial-gradient(circle at 50% 32%,#472c12,#2b1a0a);}
.aw-pit.legal{cursor:pointer;}
.aw-pit.legal .aw-pit-well{box-shadow:inset 0 4px 10px rgba(0,0,0,.5),0 0 0 3px var(--fx),0 0 16px color-mix(in srgb,var(--fx) 70%,transparent);animation:awGlow 1.5s ease-in-out infinite;}
@keyframes awGlow{0%,100%{box-shadow:inset 0 4px 10px rgba(0,0,0,.5),0 0 0 3px var(--fx),0 0 10px color-mix(in srgb,var(--fx) 55%,transparent)}50%{box-shadow:inset 0 4px 10px rgba(0,0,0,.5),0 0 0 3px var(--fx),0 0 20px color-mix(in srgb,var(--fx) 85%,transparent)}}
.aw-pit.legal:active .aw-pit-well{transform:scale(.94);}
.aw-pit.last .aw-pit-well{box-shadow:inset 0 4px 10px rgba(0,0,0,.5),0 0 0 2px #ffe4b5;}
.aw-seed{position:absolute;width:22%;height:22%;border-radius:50%;transform:translate(-50%,-50%);
  background:radial-gradient(circle at 35% 30%,#fff0d0,#d9a441 55%,#a9741f);box-shadow:0 1px 2px rgba(0,0,0,.45);}
.aw-count{position:absolute;bottom:-2px;right:-2px;min-width:17px;height:17px;padding:0 3px;border-radius:9px;display:grid;place-items:center;
  font-family:var(--font-d);font-size:.72rem;color:#3a2410;background:#ffe4b5;box-shadow:0 1px 3px rgba(0,0,0,.4);}
.aw-pit.mine .aw-count{background:var(--fx);color:#fff;}

.aw-gain{text-align:center;font-family:var(--font-d);font-size:.95rem;color:var(--fx);margin:.5rem auto;}
.aw-hint{text-align:center;font-size:.78rem;font-weight:700;color:var(--muted);margin:.4rem auto;max-width:420px;line-height:1.35;padding:0 .5rem;}
.aw-over-note{text-align:center;font-weight:800;color:var(--fx);margin:.6rem auto;font-size:.9rem;}
`;
