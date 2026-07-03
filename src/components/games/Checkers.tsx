import { motion, AnimatePresence } from "framer-motion";
import { dbRef, update } from "../../lib/firebase";
import { initCheckersBoard } from "../../lib/gameData";
import {
  applyMove,
  captureMoves,
  hasAnyCapture,
  hasAnyMove,
  legalMovesFrom,
} from "../../lib/checkersRules";
import { useTrackedPieces } from "../../lib/pieceTracking";
import { bestCheckersTurn } from "../../lib/ai/checkersAI";
import { useSoloAI } from "../../hooks/useSoloAI";
import type { Room } from "../../types";

// Piece colours: player 0 = red, player 1 = dark (kept from original).
const PCOL = ["#ff5f57", "#1a1a2e"];

interface CheckersProps {
  room: Room;
  roomId: string;
  playerId: string;
  onLeave: () => void;
}

// Scoped chrome — all theme-var driven so it reads in light AND dark mode.
const CSS = `
.chk-banner {
  display: flex; align-items: center; justify-content: center; gap: .4rem;
  margin: .5rem auto; max-width: 92vw; padding: .45rem .8rem;
  border-radius: var(--radius); font-weight: 800; font-size: .9rem;
  background: color-mix(in srgb, var(--danger) 18%, var(--surface-1));
  color: var(--danger); border: 1px solid color-mix(in srgb, var(--danger) 40%, transparent);
  box-shadow: var(--shadow);
}

/* ── Two-layer animated board ─────────────────────────────── */
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
.checkers-stage .chk-cell { aspect-ratio: auto; width: 100%; height: 100%; }
.checkers-stage .chk-cell:not(.dark) { background: linear-gradient(135deg, #f3ddb8 0%, #ead1a4 100%); }
.checkers-stage .chk-cell.dark { background: linear-gradient(135deg, #b98a5f 0%, #a2703f 100%); }
.checkers-stage .chk-cell.hint::after {
  content: ''; position: absolute; inset: 32%; border-radius: 50%;
  background: radial-gradient(circle, rgba(80,190,110,.9), rgba(70,170,95,.5));
  box-shadow: 0 0 8px 1px rgba(76,175,80,.5); pointer-events: none; z-index: 1;
}

.piece-layer { position: absolute; inset: 0; pointer-events: none; z-index: 5; }
.anim-piece {
  position: absolute; top: 0; left: 0; width: 12.5%; height: 12.5%;
  display: flex; align-items: center; justify-content: center; will-change: transform;
}

/* Realistic beveled, glossy discs. */
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
/* Concentric ring detailing on top of the disc. */
.ckp-disc::before {
  content: ''; position: absolute; inset: 15%; border-radius: 50%;
  border: 2px solid rgba(255,255,255,.16);
  box-shadow: inset 0 0 0 2px rgba(0,0,0,.2);
}
/* Soft cast shadow beneath the disc. */
.ckp-disc::after {
  content: ''; position: absolute; bottom: -9%; left: 13%; width: 74%; height: 22%;
  background: radial-gradient(ellipse at center, rgba(0,0,0,.42), transparent 72%);
  border-radius: 50%; z-index: -1; filter: blur(2px);
}
/* Kings: golden ring + crown emblem. */
.ckp-king::before { border-color: rgba(255,210,80,.7); box-shadow: inset 0 0 0 2px rgba(255,190,50,.45); }
.ckp-crown {
  position: relative; z-index: 2; font-size: clamp(.8rem, 4.4vw, 1.4rem);
  color: #ffd54a; line-height: 1;
  text-shadow: 0 1px 2px rgba(0,0,0,.65), 0 0 7px rgba(255,190,60,.65);
}
.ckp-sel { transform: scale(1.12) translateY(-2px); box-shadow: 0 8px 12px rgba(0,0,0,.5), inset 0 2px 4px rgba(255,255,255,.4), inset 0 -5px 9px rgba(0,0,0,.4), 0 0 0 3px rgba(76,175,80,.85); }

.chk-cell.chk-chain::before {
  content: ''; position: absolute; inset: 6%; border-radius: 50%;
  box-shadow: 0 0 0 3px var(--gold), 0 0 14px 2px var(--gold);
  pointer-events: none; z-index: 1;
}
.chk-cell.chk-cap::after { background: rgba(240,69,94,.55) !important; }
.chk-legend {
  display: flex; align-items: center; justify-content: center; gap: 1rem;
  margin-top: .6rem; color: var(--muted); font-size: .85rem;
}
.chk-legend .chk-li { display: flex; align-items: center; gap: .35rem; }
.chk-legend .chk-dot { width: 14px; height: 14px; border-radius: 50%; box-shadow: 0 1px 3px rgba(0,0,0,.3); }
`;

export function Checkers({ room, roomId, playerId, onLeave }: CheckersProps) {
  // Derive everything defensively from the room (guards partial data).
  const board: number[][] = room.board || initCheckersBoard();
  const currentTurn = room.currentTurn || 0;
  const players = Object.values(room.players || {});
  const myIdx = players.findIndex(p => p.id === playerId);
  const oppIdx = myIdx === 0 ? 1 : 0;
  const isMyTurn = myIdx >= 0 && myIdx === currentTurn % 2 && !room.winner;

  const sel = (room.selected || null) as [number, number] | null;
  const hints = (room.hints || []) as [number, number][];
  const chain = (room.chkChain || null) as [number, number] | null;

  // --- Solo mode: computer opponent -------------------------------------
  // In solo mode the room carries an `aiId`; the AI is one of the players.
  // This is inert (aiTurn === false, useSoloAI never fires) in multiplayer.
  const aiId = room.aiId;
  const aiIdx = aiId ? players.findIndex(p => p.id === aiId) : -1;
  const aiTurn = !!aiId && aiIdx >= 0 && !room.winner && currentTurn % 2 === aiIdx;

  const playAITurn = () => {
    if (!aiId || aiIdx < 0 || room.winner) return;
    const path = bestCheckersTurn(board, aiIdx, room.soloDifficulty || "moyen");
    if (!path || path.length < 2) return;

    // Apply the whole turn (multi-jump chains included) ATOMICALLY: fold
    // applyMove over consecutive squares, then write ONE update so no chain
    // state ever leaks to the human player.
    let finalBoard = board;
    for (let i = 0; i < path.length - 1; i++) {
      finalBoard = applyMove(finalBoard, path[i], path[i + 1], aiIdx).board;
    }

    const humanIdx = aiIdx === 0 ? 1 : 0;
    const upd: Record<string, unknown> = {
      board: finalBoard,
      selected: null,
      hints: [],
      chkChain: null,
      currentTurn: currentTurn + 1,
    };
    if (!hasAnyMove(finalBoard, humanIdx)) {
      upd.winner = (players[aiIdx] || {}).name || "Ordinateur";
      upd.status = "finished";
    }
    update(dbRef(`games/${roomId}`), upd);
  };

  useSoloAI(aiTurn, currentTurn, () => playAITurn());

  // Mandatory-capture flag for the player to move.
  const mustCapture = myIdx >= 0 && hasAnyCapture(board, myIdx);

  // Is a given one of MY squares selectable right now?
  const isSelectable = (r: number, c: number): boolean => {
    const myPieces = myIdx === 0 ? [1, 3] : [2, 4];
    if (!myPieces.includes(board[r][c])) return false;
    // During a chain, only the chaining piece may move.
    if (chain) return chain[0] === r && chain[1] === c;
    // Under forced capture, only pieces that actually have a capture.
    if (mustCapture) return captureMoves(board, r, c).length > 0;
    return true;
  };

  const selectPiece = (r: number, c: number) => {
    const h = mustCapture || chain
      ? captureMoves(board, r, c)
      : legalMovesFrom(board, r, c, myIdx, false);
    update(dbRef(`games/${roomId}`), { selected: [r, c], hints: h });
  };

  const handleCell = (r: number, c: number) => {
    if (!isMyTurn || myIdx < 0) return;

    // Tapping a highlighted destination = execute the move.
    const isHint = !!sel && hints.some(h => h[0] === r && h[1] === c);
    if (sel && isHint) {
      // Re-validate against the authoritative rules before writing.
      const legal = legalMovesFrom(board, sel[0], sel[1], myIdx, mustCapture);
      const stillLegal = legal.some(m => m[0] === r && m[1] === c);
      if (!stillLegal) return;

      const res = applyMove(board, sel, [r, c], myIdx);

      if (res.captured && res.canChain) {
        // Same piece must keep jumping — turn does NOT pass.
        update(dbRef(`games/${roomId}`), {
          board: res.board,
          selected: res.dest,
          hints: captureMoves(res.board, res.dest[0], res.dest[1]),
          chkChain: res.dest,
        });
        return;
      }

      // Turn ends: clear selection/chain, advance turn, test opponent.
      const upd: Record<string, unknown> = {
        board: res.board,
        selected: null,
        hints: [],
        chkChain: null,
        currentTurn: currentTurn + 1,
      };
      if (!hasAnyMove(res.board, oppIdx)) {
        // Opponent has no pieces or no legal move → I win.
        upd.winner = (players[myIdx] || {}).name || "Gagnant";
        upd.status = "finished";
      }
      update(dbRef(`games/${roomId}`), upd);
      return;
    }

    // Otherwise: (re)select one of my selectable pieces, or clear.
    if (isSelectable(r, c)) {
      selectPiece(r, c);
    } else if (!chain) {
      // Never allow abandoning an in-progress chain by deselecting.
      update(dbRef(`games/${roomId}`), { selected: null, hints: [] });
    }
  };

  const turnName = (players[currentTurn % 2] || {}).name || "…";

  // Stable-id pieces for the floating animation layer (render only).
  const pieces = useTrackedPieces(board);

  return (
    <div className="screen game-screen">
      <style>{CSS}</style>
      <div className="game-topbar">
        <button className="btn-back" onClick={onLeave}>✕</button>
        <div
          className="turn-indicator"
          style={{ background: isMyTurn ? "rgba(76,175,80,.2)" : "rgba(0,0,0,.05)" }}
        >
          {isMyTurn ? "🟢 Ton tour" : `⏳ ${turnName}`}
        </div>
        <div className="score-mini">
          {aiTurn && (
            <span className="ai-thinking"><span className="ai-dot" />🤖 réfléchit…</span>
          )}
          {players.map((p, i) => (
            <span key={p.id} style={{ color: PCOL[i % 2] }}>{p.name.slice(0, 4)}</span>
          ))}
        </div>
      </div>

      {room.winner && <div className="win-banner">🎉 {room.winner} gagne !</div>}

      {isMyTurn && !room.winner && (chain || mustCapture) && (
        <div className="chk-banner">
          {chain ? "🔗 Enchaîne la prise !" : "⚠️ Prise obligatoire !"}
        </div>
      )}

      <div className="checkers-stage">
        {/* Squares layer — clicks + highlights, no discs. */}
        <div className="checkers-squares">
          {board.map((row, r) =>
            row.map((_, c) => {
              const isDark = (r + c) % 2 === 1;
              const isSel = !!sel && sel[0] === r && sel[1] === c;
              const isHint = hints.some(h => h[0] === r && h[1] === c);
              const isChain = !!chain && chain[0] === r && chain[1] === c;
              // Capture-destination hints get a red overlay (vs green for steps).
              const capHint = isHint && !!sel && Math.abs(r - sel[0]) === 2;
              const cls = [
                "chk-cell",
                isDark ? "dark" : "",
                isSel ? "sel" : "",
                isHint ? "hint" : "",
                capHint ? "chk-cap" : "",
                isChain ? "chk-chain" : "",
              ].filter(Boolean).join(" ");
              return <div key={`${r}-${c}`} className={cls} onClick={() => handleCell(r, c)} />;
            })
          )}
        </div>

        {/* Piece layer — floats above squares and glides between them. */}
        <div className="piece-layer">
          <AnimatePresence initial={false}>
            {pieces.map(p => {
              const isRed = p.kind === "1" || p.kind === "3";
              const isKing = p.kind === "3" || p.kind === "4";
              const isSelPiece = !!sel && sel[0] === p.r && sel[1] === p.c;
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
        {mustCapture ? "Prise obligatoire — capture une pièce adverse" : "Tap une pièce, puis sa destination"}
      </div>
    </div>
  );
}
