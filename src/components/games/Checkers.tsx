import { dbRef, update } from "../../lib/firebase";
import { initCheckersBoard } from "../../lib/gameData";
import {
  applyMove,
  captureMoves,
  hasAnyCapture,
  hasAnyMove,
  legalMovesFrom,
} from "../../lib/checkersRules";
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

      <div className="checkers-board">
        {board.map((row, r) =>
          row.map((cell, c) => {
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
            return (
              <div key={`${r}-${c}`} className={cls} onClick={() => handleCell(r, c)}>
                {(cell === 1 || cell === 3) && (
                  <div className="piece" style={{ background: PCOL[0] }}>{cell === 3 ? "♛" : ""}</div>
                )}
                {(cell === 2 || cell === 4) && (
                  <div className="piece" style={{ background: PCOL[1] }}>{cell === 4 ? "♛" : ""}</div>
                )}
              </div>
            );
          })
        )}
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
