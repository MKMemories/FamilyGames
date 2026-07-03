import { dbRef, update } from "../../lib/firebase";
import { checkConnect4Win } from "../../lib/gameData";
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

  const drop = (col: number) => {
    if (!isMyTurn || room.winner) return;
    let row = -1;
    for (let r = 5; r >= 0; r--) { if (!board[r][col]) { row = r; break; } }
    if (row === -1) return;
    const nb = board.map(r => [...r]);
    nb[row][col] = myIdx + 1;
    const winner = checkConnect4Win(nb, row, col, myIdx + 1) ? players[myIdx].name : null;
    const full = nb.every(r => r.every(c => c !== 0));
    const upd: any = { board: nb, currentTurn: currentTurn + 1 };
    if (winner) { upd.winner = winner; upd.status = "finished"; upd.scores = { ...(room.scores || {}), [playerId]: ((room.scores || {})[playerId] || 0) + 10 }; }
    else if (full) { upd.winner = "Égalité"; upd.status = "finished"; }
    update(dbRef(`games/${roomId}`), upd);
  };

  return (
    <div className="screen game-screen c4-screen">
      <div className="game-topbar">
        <button className="btn-back" onClick={onLeave}>✕</button>
        <div className={`turn-indicator ${isMyTurn ? "mine" : "waiting"}`}>
          {isMyTurn ? "🟢 Ton tour !" : `⏳ Tour de ${(players[currentTurn % 2] || {}).name || "..."}`}
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
