import { useState } from "react";
import { dbRef, update } from "../../lib/firebase";
import { CHESS_INIT, CHESS_UNICODE } from "../../lib/gameData";
import { legalMoves, applyMove, isPromotion, statusFor, type Ctx } from "../../lib/chessRules";
import { useSoloAI } from "../../hooks/useSoloAI";
import { bestChessMove } from "../../lib/ai/chessAI";
import type { Room } from "../../types";

interface ChessProps {
  room: Room;
  roomId: string;
  playerId: string;
  onLeave: () => void;
}

const PROMO_PIECES = ["Q", "R", "B", "N"] as const;

export function Chess({ room, roomId, playerId, onLeave }: ChessProps) {
  // ── State derived entirely from `room` (single source of truth) ──
  const board: string[][] = room.board || CHESS_INIT.map(r => [...r]);
  const currentTurn = room.currentTurn || 0;
  const players = Object.values(room.players || {});
  const myIdx = players.findIndex(p => p.id === playerId);
  const isWhite = myIdx === 0;                 // white = players[0]
  const isMyTurn = myIdx === currentTurn % 2;  // white plays on even turns
  const sel = (room.selected ?? null) as [number, number] | null;
  const hints = (room.hints || []) as [number, number][];
  const check = (room.chessCheck ?? null) as [number, number] | null;
  const ctx: Ctx = { castle: room.chessCastle ?? "KQkq", ep: room.chessEp ?? null };

  // Only transient UI state: a move awaiting a promotion-piece choice.
  const [promo, setPromo] = useState<{ from: [number, number]; to: [number, number] } | null>(null);

  const isMine = (cell: string) =>
    cell !== "" && (isWhite ? cell === cell.toUpperCase() : cell === cell.toLowerCase());

  // Commit a fully-validated move to Firebase. Mover-agnostic: the side to
  // move is derived from `currentTurn` (white on even turns), so the SAME
  // path serves both a human click and the AI's move.
  const commitMove = (from: [number, number], to: [number, number], promoteTo = "Q") => {
    const moverIdx = currentTurn % 2;          // 0 = white, 1 = black
    const moverWhite = moverIdx === 0;
    const mover = players[moverIdx];
    const { board: nb, castle, ep } = applyMove(board, from, to, ctx, promoteTo);
    const st = statusFor(nb, !moverWhite, { castle, ep }); // status for the opponent (next to move)

    const upd: Record<string, unknown> = {
      board: nb,
      selected: null,
      hints: [],
      currentTurn: currentTurn + 1,
      chessCastle: castle,
      chessEp: ep,
      chessCheck: st.king,
    };
    if (st.status === "checkmate") {
      upd.winner = mover?.name ?? "?";
      upd.status = "finished";
      const mid = mover?.id;
      if (mid) upd.scores = { ...(room.scores || {}), [mid]: ((room.scores || {})[mid] || 0) + 10 };
    } else if (st.status === "stalemate") {
      upd.winner = "Égalité";
      upd.status = "finished";
      upd.chessCheck = null;
    }
    setPromo(null);
    update(dbRef(`games/${roomId}`), upd);
  };

  const handleCell = (r: number, c: number) => {
    if (promo || !isMyTurn || room.winner || myIdx < 0) return;
    const cell = board[r][c];

    // No selection yet: pick one of my own pieces and show its legal moves.
    if (!sel) {
      if (!isMine(cell)) return;
      update(dbRef(`games/${roomId}`), { selected: [r, c], hints: legalMoves(board, r, c, ctx) });
      return;
    }

    // Re-select another of my pieces.
    if (isMine(cell)) {
      update(dbRef(`games/${roomId}`), { selected: [r, c], hints: legalMoves(board, r, c, ctx) });
      return;
    }

    // Tapped a non-hint square → deselect. (Re-validate against hints.)
    if (!hints.some(h => h[0] === r && h[1] === c)) {
      update(dbRef(`games/${roomId}`), { selected: null, hints: [] });
      return;
    }

    // Legal destination: promotion needs a picker first, otherwise commit.
    if (isPromotion(board, sel, [r, c])) { setPromo({ from: sel, to: [r, c] }); return; }
    commitMove(sel, [r, c], "Q");
  };

  // ── Computer opponent (solo vs AI) ──────────────────────────────────
  // Only active when the room carries an `aiId` (solo mode). In multiplayer
  // there is no aiId, so `aiTurn` is always false and this has no effect.
  const aiId = room.aiId;
  const aiIdx = aiId ? players.findIndex(p => p.id === aiId) : -1;
  const aiTurn = !!aiId && aiIdx >= 0 && !room.winner && currentTurn % 2 === aiIdx;

  const playAIMove = () => {
    const mv = bestChessMove(board, aiIdx === 0, ctx, room.soloDifficulty || "moyen");
    if (mv) commitMove(mv.from, mv.to, mv.promo || "Q");
  };
  useSoloAI(aiTurn, currentTurn, () => playAIMove());

  const turnName = (players[currentTurn % 2] || {}).name || "…";
  const inCheck = !!check && !room.winner;

  return (
    <div className="screen game-screen">
      <div className="game-topbar">
        <button className="btn-back" onClick={onLeave}>✕</button>
        <div className="turn-indicator" style={{ background: isMyTurn ? "rgba(76,175,80,.2)" : "rgba(0,0,0,.05)" }}>
          {isMyTurn ? "🟢 Ton tour" : `⏳ ${turnName}`}
          {inCheck && <span className="chess-check-badge">Échec !</span>}
          {aiTurn && <span className="ai-thinking" style={{ marginLeft: ".45rem" }}><span className="ai-dot" />🤖 réfléchit…</span>}
        </div>
        <div className="score-mini">
          {players.map((p, i) => (
            <span key={p.id}>{i === 0 ? "♔" : "♚"} {p.name.slice(0, 5)}</span>
          ))}
        </div>
      </div>

      {room.winner && (
        <div className="win-banner">
          {room.winner === "Égalité" ? "🤝 Égalité !" : `🎉 ${room.winner} — échec et mat !`}
        </div>
      )}

      <div className="chess-board">
        {board.map((row, r) =>
          row.map((cell, c) => {
            const light = (r + c) % 2 === 0;
            const isSel = sel && sel[0] === r && sel[1] === c;
            const isHint = hints.some(h => h[0] === r && h[1] === c);
            const isCheck = check && check[0] === r && check[1] === c;
            const whitePiece = cell !== "" && cell === cell.toUpperCase();
            return (
              <div
                key={`${r}-${c}`}
                className={`chess-cell ${light ? "light" : "dark"} ${isSel ? "sel" : ""} ${isHint ? "hint" : ""} ${isCheck ? "check" : ""}`}
                onClick={() => handleCell(r, c)}
              >
                {cell && (
                  <span className={`chess-piece ${whitePiece ? "white" : "black"}`}>
                    {CHESS_UNICODE[cell] || cell}
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>
      <div className="chess-coords"><div>a b c d e f g h</div></div>

      {/* ── Promotion picker (in the mover's colour) ── */}
      {promo && (
        <div className="chess-promo-overlay" onClick={() => { setPromo(null); update(dbRef(`games/${roomId}`), { selected: null, hints: [] }); }}>
          <div className="chess-promo-panel" onClick={e => e.stopPropagation()}>
            <div className="chess-promo-title">Promotion</div>
            <div className="chess-promo-row">
              {PROMO_PIECES.map(pc => {
                const glyph = isWhite ? pc : pc.toLowerCase();
                return (
                  <button
                    key={pc}
                    className="chess-promo-btn"
                    onClick={() => commitMove(promo.from, promo.to, pc)}
                  >
                    {CHESS_UNICODE[glyph]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <style>{CHESS_CSS}</style>
    </div>
  );
}

/* Theme-aware chrome; the wood squares stay in index.css. New classes are
   prefixed `chess-` and read the app's CSS variables for light/dark parity. */
const CHESS_CSS = `
.chess-piece { position: relative; z-index: 2; }
.chess-cell.check::before {
  content: ''; position: absolute; inset: 0; pointer-events: none; z-index: 1;
  background: radial-gradient(circle at 50% 45%, rgba(240,69,94,.75), rgba(240,69,94,.30) 65%, transparent 78%);
  box-shadow: inset 0 0 0 3px rgba(240,69,94,.85);
}
.chess-check-badge {
  margin-left: .45rem; padding: .1rem .5rem; border-radius: 999px;
  background: var(--danger); color: #fff; font-weight: 900; font-size: .68rem;
  letter-spacing: .03em; box-shadow: 0 2px 8px rgba(240,69,94,.4);
}
.chess-promo-overlay {
  position: fixed; inset: 0; z-index: 50; display: flex; align-items: center; justify-content: center;
  background: rgba(10,8,24,.5); backdrop-filter: blur(3px);
}
.chess-promo-panel {
  background: var(--surface-1); border: 1px solid var(--border); border-radius: var(--radius);
  box-shadow: var(--shadow-lg, var(--shadow)); padding: 1rem 1.1rem; text-align: center;
}
.chess-promo-title {
  font-family: var(--font-d); color: var(--text); font-size: 1.05rem; margin-bottom: .7rem;
}
.chess-promo-row { display: flex; gap: .5rem; }
.chess-promo-btn {
  width: 56px; height: 56px; border-radius: var(--radius-sm, .7rem);
  border: 2px solid var(--border); background: var(--surface-2); color: var(--text);
  font-size: 2rem; line-height: 1; cursor: pointer; transition: transform .12s, border-color .12s, background .12s;
  display: flex; align-items: center; justify-content: center;
}
.chess-promo-btn:hover { transform: translateY(-3px); border-color: var(--accent); background: rgba(var(--accent-rgb),.14); }
`;
