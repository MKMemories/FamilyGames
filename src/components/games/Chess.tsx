import { dbRef, update } from "../../lib/firebase";
import { CHESS_INIT, CHESS_UNICODE, getChessMoves } from "../../lib/gameData";
import type { Room } from "../../types";

interface ChessProps {
  room: Room;
  roomId: string;
  playerId: string;
  onLeave: () => void;
}

export function Chess({ room, roomId, playerId, onLeave }: ChessProps) {
  const board: string[][] = room.board || CHESS_INIT.map(r => [...r]);
  const currentTurn = room.currentTurn || 0;
  const players = Object.values(room.players || {});
  const myIdx = players.findIndex(p => p.id === playerId);
  const isMyTurn = myIdx === currentTurn % 2;
  const sel = room.selected as [number, number] | null;
  const hints = (room.hints || []) as [number, number][];

  const handleCell = (r: number, c: number) => {
    if (!isMyTurn || room.winner) return;
    const isWhite = myIdx === 0;
    const cell = board[r][c];
    const isMine = cell && ((isWhite && cell === cell.toUpperCase()) || (!isWhite && cell === cell.toLowerCase()));

    if (!sel) {
      if (!isMine) return;
      const h = getChessMoves(board, r, c, isWhite);
      update(dbRef(`games/${roomId}`), { selected: [r, c], hints: h });
    } else {
      if (isMine) {
        const h = getChessMoves(board, r, c, isWhite);
        update(dbRef(`games/${roomId}`), { selected: [r, c], hints: h });
        return;
      }
      const isHint = hints.some(h => h[0] === r && h[1] === c);
      if (!isHint) { update(dbRef(`games/${roomId}`), { selected: null, hints: [] }); return; }
      const nb = board.map(row => [...row]);
      const captured = nb[r][c];
      nb[r][c] = nb[sel[0]][sel[1]];
      nb[sel[0]][sel[1]] = "";
      if (nb[r][c] === "P" && r === 0) nb[r][c] = "Q";
      if (nb[r][c] === "p" && r === 7) nb[r][c] = "q";
      const isKingCaptured = captured === "k" || captured === "K";
      const upd: any = { board: nb, selected: null, hints: [], currentTurn: currentTurn + 1 };
      if (isKingCaptured) { upd.winner = players[myIdx].name; upd.status = "finished"; }
      update(dbRef(`games/${roomId}`), upd);
    }
  };

  return (
    <div className="screen game-screen">
      <div className="game-topbar">
        <button className="btn-back" onClick={onLeave}>✕</button>
        <div className="turn-indicator" style={{ background: isMyTurn ? "rgba(76,175,80,.2)" : "rgba(0,0,0,.05)" }}>
          {isMyTurn ? "🟢 Ton tour" : `⏳ ${(players[currentTurn % 2] || {}).name || "…"}`}
        </div>
        <div className="score-mini">
          {players.map((p, i) => (
            <span key={p.id}>{i === 0 ? "♔" : "♚"} {p.name.slice(0, 5)}</span>
          ))}
        </div>
      </div>

      {room.winner && <div className="win-banner">🎉 {room.winner} !</div>}

      <div className="chess-board">
        {board.map((row, r) =>
          row.map((cell, c) => {
            const light = (r + c) % 2 === 0;
            const isSel = sel && sel[0] === r && sel[1] === c;
            const isHint = hints.some(h => h[0] === r && h[1] === c);
            const isWhitePiece = cell && cell === cell.toUpperCase();
            return (
              <div
                key={`${r}-${c}`}
                className={`chess-cell ${light ? "light" : "dark"} ${isSel ? "sel" : ""} ${isHint ? "hint" : ""}`}
                onClick={() => handleCell(r, c)}
              >
                {cell && (
                  <span className={`chess-piece ${isWhitePiece ? "white" : "black"}`}>
                    {CHESS_UNICODE[cell] || cell}
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>
      <div className="chess-coords"><div>a b c d e f g h</div></div>
    </div>
  );
}
