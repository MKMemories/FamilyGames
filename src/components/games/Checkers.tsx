import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { dbRef, update } from "../../lib/firebase";
import { initCheckersBoard } from "../../lib/gameData";
import {
  legalMoves,
  applyMoveFull,
  hasAnyMove,
  quietMoves,
  type Move,
  type Cell,
} from "../../lib/checkersRules";
import { useTrackedPieces } from "../../lib/pieceTracking";
import { bestCheckersTurn } from "../../lib/ai/checkersAI";
import { useSoloAI } from "../../hooks/useSoloAI";
import type { Room } from "../../types";

// Piece colours: player 0 = red, player 1 = dark.
const PCOL = ["#ff5f57", "#1a1a2e"];
const eq = (a: Cell, b: Cell) => a[0] === b[0] && a[1] === b[1];

interface CheckersProps {
  room: Room;
  roomId: string;
  playerId: string;
  onLeave: () => void;
}

export function Checkers({ room, roomId, playerId, onLeave }: CheckersProps) {
  const board: number[][] = room.board || initCheckersBoard();
  const currentTurn = room.currentTurn || 0;
  const players = Object.values(room.players || {});
  const myIdx = players.findIndex(p => p.id === playerId);
  const oppIdx = myIdx === 0 ? 1 : 0;
  const isMyTurn = myIdx >= 0 && myIdx === currentTurn % 2 && !room.winner;
  const myVals = myIdx === 0 ? [1, 3] : [2, 4];

  // Local selection state (the moving piece + chosen landing squares of an
  // in-progress capture). Reset whenever the turn changes.
  const [sel, setSel] = useState<Cell | null>(null);
  const [path, setPath] = useState<Cell[]>([]);
  useEffect(() => { setSel(null); setPath([]); }, [currentTurn, roomId, room.winner]);

  // Legal moves for me now. legalMoves returns ONLY maximal captures when any
  // capture exists (mandatory + maximum-capture rule), else quiet moves.
  const myMoves: Move[] = isMyTurn ? legalMoves(board, myIdx) : [];
  const capturing = myMoves.length > 0 && myMoves[0].type === "capture";
  const capSeqs = capturing
    ? (myMoves.filter(m => m.type === "capture") as Extract<Move, { type: "capture" }>[]).map(m => m.seq)
    : [];
  const maxLen = capSeqs[0]?.steps.length ?? 0;

  // Capture sequences still matching my current partial `path`.
  const matching = sel && capturing
    ? capSeqs.filter(s => eq(s.from, sel) && path.every((p, i) => s.steps[i] && eq(s.steps[i].to, p)))
    : [];

  // Next tappable destinations given the current selection.
  const nextOpts: Cell[] = (() => {
    if (!sel || !isMyTurn) return [];
    if (capturing) {
      const opts: Cell[] = [];
      const seen = new Set<string>();
      for (const s of matching) {
        const st = s.steps[path.length];
        if (st && !seen.has(st.to.join(","))) { seen.add(st.to.join(",")); opts.push(st.to); }
      }
      return opts;
    }
    return quietMoves(board, sel[0], sel[1]);
  })();

  const isSelectable = (r: number, c: number): boolean => {
    if (!isMyTurn || !myVals.includes(board[r][c])) return false;
    if (capturing) return capSeqs.some(s => eq(s.from, [r, c]));
    return quietMoves(board, r, c).length > 0;
  };

  // Display board = board with the chosen partial capture applied (so the
  // piece hops and captured pieces vanish as you build a chain).
  const displayBoard: number[][] = (() => {
    if (sel && capturing && path.length > 0 && matching[0]) {
      const nb = board.map(row => row.slice());
      const piece = nb[sel[0]][sel[1]];
      nb[sel[0]][sel[1]] = 0;
      for (let i = 0; i < path.length; i++) {
        const st = matching[0].steps[i];
        nb[st.over[0]][st.over[1]] = 0;
      }
      const last = path[path.length - 1];
      nb[last[0]][last[1]] = piece;
      return nb;
    }
    return board;
  })();
  const curPos: Cell | null = sel ? (path.length ? path[path.length - 1] : sel) : null;

  // ── Solo AI opponent (inert in multiplayer: gated on room.aiId) ──
  const aiId = room.aiId;
  const aiIdx = aiId ? players.findIndex(p => p.id === aiId) : -1;
  const aiTurn = !!aiId && aiIdx >= 0 && !room.winner && currentTurn % 2 === aiIdx;
  const playAITurn = () => {
    if (!aiId || aiIdx < 0 || room.winner) return;
    const mv = bestCheckersTurn(board, aiIdx, room.soloDifficulty || "moyen");
    if (!mv) return;
    const res = applyMoveFull(board, mv, aiIdx);
    const humanIdx = aiIdx === 0 ? 1 : 0;
    const upd: Record<string, unknown> = { board: res.board, selected: null, hints: [], chkChain: null, currentTurn: currentTurn + 1 };
    if (!hasAnyMove(res.board, humanIdx)) { upd.winner = (players[aiIdx] || {}).name || "Ordinateur"; upd.status = "finished"; }
    update(dbRef(`games/${roomId}`), upd);
  };
  useSoloAI(aiTurn, currentTurn, () => playAITurn());

  const commitMove = (move: Move) => {
    const res = applyMoveFull(board, move, myIdx);
    const upd: Record<string, unknown> = { board: res.board, selected: null, hints: [], chkChain: null, currentTurn: currentTurn + 1 };
    if (!hasAnyMove(res.board, oppIdx)) { upd.winner = (players[myIdx] || {}).name || "Gagnant"; upd.status = "finished"; }
    update(dbRef(`games/${roomId}`), upd);
    setSel(null); setPath([]);
  };

  const handleCell = (r: number, c: number) => {
    if (!isMyTurn) return;
    const cell: Cell = [r, c];

    if (capturing) {
      if (sel && nextOpts.some(o => eq(o, cell))) {
        const newPath = [...path, cell];
        if (newPath.length === maxLen) {
          const seq = capSeqs.find(s => eq(s.from, sel) && s.steps.length === maxLen && s.steps.every((st, i) => eq(st.to, newPath[i])));
          if (seq) commitMove({ type: "capture", seq });
        } else {
          setPath(newPath);
        }
        return;
      }
      // Re-pick a different capturing piece only before starting a chain.
      if (path.length === 0 && isSelectable(r, c)) { setSel(cell); setPath([]); }
      return;
    }

    // Quiet moves.
    if (sel && nextOpts.some(o => eq(o, cell))) { commitMove({ type: "quiet", from: sel, to: cell }); return; }
    if (isSelectable(r, c)) { setSel(cell); setPath([]); return; }
    setSel(null); setPath([]);
  };

  const turnName = (players[currentTurn % 2] || {}).name || "…";
  const pieces = useTrackedPieces(displayBoard);
  const chaining = capturing && path.length > 0;

  return (
    <div className="screen game-screen">
      <style>{CSS}</style>
      <div className="game-topbar">
        <button className="btn-back" onClick={onLeave}>✕</button>
        <div className={`turn-indicator ${isMyTurn ? "mine" : "waiting"}`}>
          {isMyTurn ? "🟢 Ton tour" : aiTurn ? `🤖 ${turnName} réfléchit…` : `⏳ ${turnName}`}
        </div>
        <div className="score-mini">
          {players.map((p, i) => (
            <span key={p.id} style={{ color: PCOL[i % 2] }}>{p.name.slice(0, 4)}</span>
          ))}
        </div>
      </div>

      {room.winner && <div className="win-banner">🎉 {room.winner} gagne !</div>}

      {/* Fixed-height slot so the transient banner never reflows the board. */}
      <div className="chk-status-slot">
        <AnimatePresence>
          {isMyTurn && !room.winner && capturing && (
            <motion.div
              key={chaining ? "chain" : "cap"}
              className="chk-banner"
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: 0.2 }}
            >
              {chaining ? "🔗 Enchaîne la prise maximale !" : "⚠️ Prise obligatoire — capture le maximum"}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="checkers-stage">
        <div className="checkers-squares">
          {board.map((row, r) =>
            row.map((_, c) => {
              const isDark = (r + c) % 2 === 1;
              const isSel = !!curPos && eq(curPos, [r, c]);
              const isHint = nextOpts.some(o => eq(o, [r, c]));
              const pickable = !sel && isSelectable(r, c);
              const cls = [
                "chk-cell",
                isDark ? "dark" : "",
                isSel ? "sel" : "",
                isHint ? "hint" : "",
                isHint && capturing ? "chk-cap" : "",
                pickable ? "chk-pick" : "",
              ].filter(Boolean).join(" ");
              return <div key={`${r}-${c}`} className={cls} onClick={() => handleCell(r, c)} />;
            })
          )}
        </div>

        <div className="piece-layer">
          <AnimatePresence initial={false}>
            {pieces.map(p => {
              const isRed = p.kind === "1" || p.kind === "3";
              const isKing = p.kind === "3" || p.kind === "4";
              const isSelPiece = !!curPos && curPos[0] === p.r && curPos[1] === p.c;
              return (
                <motion.div
                  key={p.id}
                  className="anim-piece"
                  initial={{ opacity: 0, scale: 0.4 }}
                  animate={{ x: `${p.c * 100}%`, y: `${p.r * 100}%`, opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.3 }}
                  transition={{
                    x: { type: "spring", stiffness: 520, damping: 34 },
                    y: { type: "spring", stiffness: 520, damping: 34 },
                    opacity: { duration: 0.18 },
                    scale: { duration: 0.18 },
                  }}
                >
                  <div className={`ckp-disc ${isRed ? "ckp-red" : "ckp-dark"} ${isKing ? "ckp-king" : ""} ${isSelPiece ? "ckp-sel" : ""}`}>
                    {isKing && <span className="ckp-crown">♛</span>}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      <div className="chk-legend">
        {players.map((p, i) => (
          <div key={p.id} className="chk-li">
            <span className="chk-dot" style={{ background: PCOL[i % 2] }} />
            {p.name}
          </div>
        ))}
      </div>
      <div className="game-hint-txt">
        {capturing ? "Dames : prise obligatoire et maximale · les dames volent" : "Tap une pièce, puis sa destination"}
      </div>
    </div>
  );
}

const CSS = `
/* Reserved-height slot: the banner fades in/out INSIDE it, so the board
   never shifts when a message appears — no forced scroll. */
.chk-status-slot {
  min-height: 2.9rem; display: flex; align-items: center; justify-content: center;
  margin: .35rem 0; padding: 0 1rem;
}
.chk-banner {
  display: flex; align-items: center; justify-content: center; gap: .4rem;
  margin: 0 auto; max-width: 92vw; padding: .45rem 1rem;
  border-radius: var(--radius); font-weight: 800; font-size: .9rem;
  background: color-mix(in srgb, var(--danger) 18%, var(--surface-1));
  color: var(--danger); border: 1px solid color-mix(in srgb, var(--danger) 40%, transparent);
  box-shadow: var(--shadow); white-space: nowrap;
}
.checkers-stage {
  position: relative; width: min(92vw, 400px); aspect-ratio: 1; margin: 1rem auto;
  border-radius: 12px; overflow: hidden;
  box-shadow: 0 18px 40px rgba(0,0,0,.28), 0 2px 6px rgba(0,0,0,.2);
  border: 3px solid #6b4a30;
}
.checkers-squares {
  position: absolute; inset: 0; display: grid;
  grid-template-columns: repeat(8, 1fr); grid-template-rows: repeat(8, 1fr);
}
.checkers-stage .chk-cell { position: relative; width: 100%; height: 100%; }
.checkers-stage .chk-cell:not(.dark) { background: linear-gradient(135deg, #f3ddb8 0%, #ead1a4 100%); }
.checkers-stage .chk-cell.dark { background: linear-gradient(135deg, #b98a5f 0%, #a2703f 100%); }
.checkers-stage .chk-cell.hint::after {
  content: ''; position: absolute; inset: 32%; border-radius: 50%;
  background: radial-gradient(circle, rgba(80,190,110,.9), rgba(70,170,95,.5));
  box-shadow: 0 0 8px 1px rgba(76,175,80,.5); pointer-events: none; z-index: 1;
}
.checkers-stage .chk-cell.chk-cap::after {
  background: radial-gradient(circle, rgba(240,69,94,.92), rgba(200,40,60,.55)) !important;
  box-shadow: 0 0 9px 1px rgba(240,69,94,.55) !important;
}
.checkers-stage .chk-cell.sel::before {
  content: ''; position: absolute; inset: 5%; border-radius: 10px;
  box-shadow: inset 0 0 0 3px rgba(76,175,80,.85); pointer-events: none; z-index: 1;
}
.checkers-stage .chk-cell.chk-pick::before {
  content: ''; position: absolute; inset: 22%; border-radius: 50%;
  box-shadow: 0 0 0 2px var(--gold); opacity: .55; pointer-events: none; z-index: 1;
  animation: chkPick 1.3s ease-in-out infinite;
}
@keyframes chkPick { 0%,100%{opacity:.3} 50%{opacity:.75} }

.piece-layer { position: absolute; inset: 0; pointer-events: none; z-index: 5; }
.anim-piece {
  position: absolute; top: 0; left: 0; width: 12.5%; height: 12.5%;
  display: flex; align-items: center; justify-content: center; will-change: transform;
}
.ckp-disc {
  position: relative; width: 76%; height: 76%; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  box-shadow:
    0 5px 8px rgba(0,0,0,.45),
    inset 0 2px 4px rgba(255,255,255,.4),
    inset 0 -5px 9px rgba(0,0,0,.4),
    0 0 0 2px rgba(0,0,0,.22);
  transition: transform .16s ease, box-shadow .16s ease;
}
.ckp-red  { background: radial-gradient(circle at 34% 28%, #ff9a90 0%, #f4483c 45%, #b41f16 100%); }
.ckp-dark { background: radial-gradient(circle at 34% 28%, #55556f 0%, #24243c 48%, #0c0c18 100%); }
.ckp-disc::before {
  content: ''; position: absolute; inset: 15%; border-radius: 50%;
  border: 2px solid rgba(255,255,255,.16);
  box-shadow: inset 0 0 0 2px rgba(0,0,0,.2);
}
.ckp-disc::after {
  content: ''; position: absolute; bottom: -9%; left: 13%; width: 74%; height: 22%;
  background: radial-gradient(ellipse at center, rgba(0,0,0,.42), transparent 72%);
  border-radius: 50%; z-index: -1; filter: blur(2px);
}
.ckp-king::before { border-color: rgba(255,210,80,.7); box-shadow: inset 0 0 0 2px rgba(255,190,50,.45); }
.ckp-crown {
  position: relative; z-index: 2; font-size: clamp(.8rem, 4.4vw, 1.4rem);
  color: #ffd54a; line-height: 1;
  text-shadow: 0 1px 2px rgba(0,0,0,.65), 0 0 7px rgba(255,190,60,.65);
}
.ckp-sel { transform: scale(1.12) translateY(-2px); box-shadow: 0 8px 12px rgba(0,0,0,.5), inset 0 2px 4px rgba(255,255,255,.4), inset 0 -5px 9px rgba(0,0,0,.4), 0 0 0 3px rgba(76,175,80,.85); }
.chk-legend {
  display: flex; align-items: center; justify-content: center; gap: 1rem;
  margin-top: .6rem; color: var(--muted); font-size: .85rem;
}
.chk-legend .chk-li { display: flex; align-items: center; gap: .35rem; }
.chk-legend .chk-dot { width: 14px; height: 14px; border-radius: 50%; box-shadow: 0 1px 3px rgba(0,0,0,.3); }
`;
