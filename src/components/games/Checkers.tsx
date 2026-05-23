import { dbRef, update } from "../../lib/firebase";
import { initCheckersBoard, getCheckersMoves } from "../../lib/gameData";
import type { Room } from "../../types";

const PCOL = ["#ff5f57", "#1a1a2e"];

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
  const isMyTurn = myIdx === currentTurn % 2;
  const sel = room.selected as [number, number] | null;
  const hints = (room.hints || []) as [number, number][];

  const handleCell = (r: number, c: number) => {
    if (!isMyTurn || room.winner) return;
    const myPieces = myIdx === 0 ? [1, 3] : [2, 4];
    if (!sel) {
      if (!myPieces.includes(board[r][c])) return;
      const h = getCheckersMoves(board, r, c, myIdx);
      update(dbRef(`games/${roomId}`), { selected: [r, c], hints: h });
    } else {
      const isHint = hints.some(h => h[0] === r && h[1] === c);
      if (!isHint) {
        if (myPieces.includes(board[r][c])) {
          const h = getCheckersMoves(board, r, c, myIdx);
          update(dbRef(`games/${roomId}`), { selected: [r, c], hints: h });
        } else {
          update(dbRef(`games/${roomId}`), { selected: null, hints: [] });
        }
        return;
      }
      const nb = board.map(row => [...row]);
      const piece = nb[sel[0]][sel[1]];
      nb[sel[0]][sel[1]] = 0;
      const dr = r - sel[0], dc = c - sel[1];
      if (Math.abs(dr) === 2) nb[sel[0] + dr / 2][sel[1] + dc / 2] = 0;
      nb[r][c] = piece;
      if (myIdx === 0 && r === 0) nb[r][c] = 3;
      if (myIdx === 1 && r === 7) nb[r][c] = 4;
      const opp = myIdx === 0 ? [2, 4] : [1, 3];
      const oppLeft = nb.flat().some(v => opp.includes(v));
      const upd: any = { board: nb, selected: null, hints: [], currentTurn: currentTurn + 1 };
      if (!oppLeft) { upd.winner = players[myIdx].name; upd.status = "finished"; }
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
            <span key={p.id} style={{ color: PCOL[i] }}>{p.name.slice(0, 4)}</span>
          )).reduce((a, b, i) => i === 0 ? [a, b] : [...(Array.isArray(a) ? a : [a]), " vs ", b], [] as any)}
        </div>
      </div>

      {room.winner && <div className="win-banner">🎉 {room.winner} gagne !</div>}

      <div className="checkers-board">
        {board.map((row, r) =>
          row.map((cell, c) => {
            const isDark = (r + c) % 2 === 1;
            const isSel = sel && sel[0] === r && sel[1] === c;
            const isHint = hints.some(h => h[0] === r && h[1] === c);
            return (
              <div
                key={`${r}-${c}`}
                className={`chk-cell ${isDark ? "dark" : ""} ${isSel ? "sel" : ""} ${isHint ? "hint" : ""}`}
                onClick={() => handleCell(r, c)}
              >
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
      <div className="game-hint-txt">Tap une pièce pour la sélectionner, puis la destination</div>
    </div>
  );
}
