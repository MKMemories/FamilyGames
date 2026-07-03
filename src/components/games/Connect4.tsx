import { dbRef, update } from "../../lib/firebase";
import { checkConnect4Win } from "../../lib/gameData";
import { useSoloAI } from "../../hooks/useSoloAI";
import { bestConnect4Move } from "../../lib/ai/connect4AI";
import type { Room } from "../../types";

const COLORS_C4 = ["#ff5252", "#FFD700"];

interface Connect4Props {
  room: Room;
  roomId: string;
  playerId: string;
  onLeave: () => void;
}

export function Connect4({ room, roomId, playerId, onLeave }: Connect4Props) {
  const board: number[][] = room.board || Array(6).fill(null).map(() => Array(7).fill(0));
  const currentTurn = room.currentTurn || 0;
  const players = Object.values(room.players || {});
  const myIdx = players.findIndex(p => p.id === playerId);
  const isMyTurn = myIdx === currentTurn % 2;

  // Shared placement — used by both the human drop and the AI.
  const place = (col: number, moverIdx: number, moverId: string) => {
    let row = -1;
    for (let r = 5; r >= 0; r--) { if (!board[r][col]) { row = r; break; } }
    if (row === -1) return;
    const nb = board.map(r => [...r]);
    nb[row][col] = moverIdx + 1;
    const won = checkConnect4Win(nb, row, col, moverIdx + 1);
    const full = nb.every(r => r.every(c => c !== 0));
    const upd: any = { board: nb, currentTurn: currentTurn + 1 };
    if (won) { upd.winner = players[moverIdx]?.name; upd.status = "finished"; upd.scores = { ...(room.scores || {}), [moverId]: ((room.scores || {})[moverId] || 0) + 10 }; }
    else if (full) { upd.winner = "Égalité"; upd.status = "finished"; }
    update(dbRef(`games/${roomId}`), upd);
  };

  const drop = (col: number) => {
    if (!isMyTurn || room.winner) return;
    place(col, myIdx, playerId);
  };

  // Computer opponent (solo).
  const aiId = room.aiId;
  const aiIdx = aiId ? players.findIndex(p => p.id === aiId) : -1;
  const aiTurn = !!aiId && aiIdx >= 0 && !room.winner && currentTurn % 2 === aiIdx;
  useSoloAI(aiTurn, currentTurn, () => {
    if (aiIdx < 0) return;
    const col = bestConnect4Move(board, aiIdx + 1, room.soloDifficulty || "moyen");
    if (col >= 0) place(col, aiIdx, aiId!);
  });

  return (
    <div className="screen game-screen c4-screen">
      <div className="game-topbar">
        <button className="btn-back" onClick={onLeave}>✕</button>
        <div className={`turn-indicator ${isMyTurn ? "mine" : "waiting"}`}>
          {isMyTurn ? "🟢 Ton tour !" : aiTurn ? `🤖 ${(players[aiIdx] || {}).name || "Ordinateur"} réfléchit…` : `⏳ Tour de ${(players[currentTurn % 2] || {}).name || "..."}`}
        </div>
        <div className="score-mini">
          {players.map((p, i) => (
            <span key={p.id} style={{ color: COLORS_C4[i % 2] }}>
              {p.name.slice(0, 4)} {(room.scores || {})[p.id] || 0}
            </span>
          ))}
        </div>
      </div>

      {room.winner && <div className="win-banner">🎉 {room.winner} {room.winner === "Égalité" ? "" : "gagne !"}</div>}

      <div className="c4-board-wrap">
        <div className="c4-board">
          {Array(7).fill(0).map((_, col) => (
            <div
              key={col}
              className="c4-col"
              onClick={() => drop(col)}
              style={{ pointerEvents: isMyTurn && !room.winner ? "auto" : "none" }}
            >
              {Array(6).fill(0).map((_, row) => (
                <div
                  key={row}
                  className={`c4-cell ${board[row][col] ? "filled" : ""}`}
                  style={board[row][col] ? { background: COLORS_C4[(board[row][col] - 1) % 2] } : undefined}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="c4-legend">
        {players.map((p, i) => (
          <div key={p.id} className="legend-item">
            <span className="legend-dot" style={{ background: COLORS_C4[i] }} />
            {p.name}
          </div>
        ))}
      </div>
    </div>
  );
}
