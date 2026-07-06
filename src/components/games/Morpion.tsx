import { dbRef, update } from "../../lib/firebase";
import { fx } from "../../lib/sound";
import { useSoloAI } from "../../hooks/useSoloAI";
import { bestMorpionMove } from "../../lib/ai/morpionAI";
import type { Room } from "../../types";

/* ── Morpion (Tic-Tac-Toe) · 2 joueurs, chacun son écran ──
   State model (source of truth = room):
   - mpCells: string[9]  ("" | "X" | "O")
   - mpTurn:  string     (playerId whose turn it is; empty → host starts)
   - mpWinner:string     ("" | playerId | "draw")
   - mpLine:  number[]   (winning triplet indices, for highlight)
   Host is always ✗ and plays first; the other player is ◯.                  */

interface MorpionProps {
  room: Room;
  roomId: string;
  playerId: string;
  isHost: boolean;
  isSolo: boolean;
  onLeave: () => void;
  onToast: (m: string) => void;
}

const WIN_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

function findWin(cells: string[]): { mark: string; line: number[] } | null {
  for (const line of WIN_LINES) {
    const [a, b, c] = line;
    if (cells[a] && cells[a] === cells[b] && cells[a] === cells[c]) {
      return { mark: cells[a], line };
    }
  }
  return null;
}

export function Morpion({ room, roomId, playerId, isHost, isSolo, onLeave, onToast }: MorpionProps) {
  void isSolo;
  const players = Object.values(room.players || {});
  const cells: string[] = Array.isArray(room.mpCells) && room.mpCells.length === 9
    ? room.mpCells
    : Array(9).fill("");
  const winner = room.mpWinner || "";
  const line = room.mpLine || [];
  const turn = room.mpTurn || room.hostId; // host starts by default

  const myMark = playerId === room.hostId ? "X" : "O";
  const isMyTurn = !winner && turn === playerId && players.length >= 2;
  const opponent = players.find(p => p.id !== playerId);
  const turnPlayer = players.find(p => p.id === turn);

  const markGlyph = (m: string) => (m === "X" ? "✗" : m === "O" ? "◯" : "");

  // Shared move commit — used by both the human tap and the AI.
  const commitAt = (i: number, mark: string, moverId: string) => {
    if (cells[i]) return;
    const next = [...cells];
    next[i] = mark;
    const w = findWin(next);
    const full = next.every(c => c !== "");
    const other = players.find(p => p.id !== moverId);
    fx(w ? "victory" : "place");
    if (w) {
      update(dbRef(`games/${roomId}`), { mpCells: next, mpWinner: moverId, mpLine: w.line });
    } else if (full) {
      update(dbRef(`games/${roomId}`), { mpCells: next, mpWinner: "draw", mpLine: [] });
    } else {
      update(dbRef(`games/${roomId}`), { mpCells: next, mpTurn: other ? other.id : moverId });
    }
  };

  const play = (i: number) => {
    if (winner) return;
    if (players.length < 2) { onToast("En attente de l'adversaire…"); return; }
    if (turn !== playerId) { onToast("Ce n'est pas ton tour !"); return; }
    commitAt(i, myMark, playerId);
  };

  // Computer opponent (solo). Plays once per board state when it's the AI's turn.
  const aiId = room.aiId;
  const aiTurn = !!aiId && !winner && turn === aiId && players.length >= 2;
  useSoloAI(aiTurn, cells.filter(Boolean).length, () => {
    if (!aiId) return;
    const aiMark = aiId === room.hostId ? "X" : "O";
    const idx = bestMorpionMove(cells, aiMark, room.soloDifficulty || "moyen");
    if (idx >= 0) commitAt(idx, aiMark, aiId);
  });

  const replay = () => {
    update(dbRef(`games/${roomId}`), {
      mpCells: Array(9).fill(""), mpTurn: room.hostId, mpWinner: "", mpLine: [],
    });
  };

  const winnerPlayer = winner && winner !== "draw" ? players.find(p => p.id === winner) : null;

  return (
    <div className="screen game-screen mp-screen">
      <div className="game-topbar">
        <button className="btn-back" onClick={onLeave}>✕</button>
        <div className="turn-indicator">
          {winner
            ? (winner === "draw" ? "Match nul !" : `${winnerPlayer?.name} gagne !`)
            : (isMyTurn ? "À toi de jouer" : aiTurn ? `🤖 ${turnPlayer?.name} réfléchit…` : `Au tour de ${turnPlayer?.name || "…"}`)}
        </div>
        <div className="mp-mark-badge" title="Ton symbole">{markGlyph(myMark)}</div>
      </div>

      <div className="mp-body">
        <div className="mp-players">
          {players.map(p => (
            <div
              key={p.id}
              className={`mp-player ${turn === p.id && !winner ? "active" : ""} ${winner === p.id ? "won" : ""}`}
              style={{ "--pc": p.color } as React.CSSProperties}
            >
              <span className="mp-player-mark">{markGlyph(p.id === room.hostId ? "X" : "O")}</span>
              <span className="mp-player-name">{p.name}{p.id === playerId ? " (toi)" : ""}</span>
            </div>
          ))}
          {players.length < 2 && (
            <div className="mp-player empty"><span className="mp-player-name">En attente…</span></div>
          )}
        </div>

        <div className={`mp-grid ${isMyTurn ? "myturn" : ""}`}>
          {cells.map((c, i) => (
            <button
              key={i}
              className={`mp-cell ${c ? "filled" : ""} ${c === "X" ? "x" : c === "O" ? "o" : ""} ${line.includes(i) ? "win" : ""}`}
              onClick={() => play(i)}
              disabled={!!c || !isMyTurn}
            >
              <span>{markGlyph(c)}</span>
            </button>
          ))}
        </div>

        {winner && (
          <div className="mp-result">
            <div className="mp-result-emoji">{winner === "draw" ? "🤝" : "🏆"}</div>
            <div className="mp-result-txt">
              {winner === "draw"
                ? "Égalité parfaite !"
                : (winner === playerId ? "Tu as gagné ! 🎉" : `${winnerPlayer?.name} remporte la manche`)}
            </div>
            {isHost
              ? <button className="btn btn-primary" onClick={replay}>🔄 Rejouer</button>
              : <div className="mp-wait">En attente que l'hôte relance…</div>}
          </div>
        )}
        {!winner && !isMyTurn && players.length >= 2 && (
          <div className="mp-wait"><span className="mp-dot" /> Au tour de {turnPlayer?.name}…</div>
        )}
      </div>

      <style>{MP_CSS}</style>
    </div>
  );
}

const MP_CSS = `
.mp-screen { min-height: 100vh; }
.mp-mark-badge {
  width: 40px; height: 40px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 1.3rem; font-weight: 900;
  background: color-mix(in srgb, var(--accent) 16%, var(--surface-2));
  color: var(--accent); border: 1px solid var(--border);
}
.mp-body { padding: 1.2rem 1rem; display: flex; flex-direction: column; align-items: center; gap: 1.1rem; }
.mp-players { display: flex; gap: .7rem; width: 100%; max-width: 360px; }
.mp-player {
  flex: 1; display: flex; align-items: center; justify-content: center; gap: .45rem;
  padding: .6rem .7rem; border-radius: var(--radius);
  background: var(--surface-1); border: 1.5px solid var(--border);
  box-shadow: var(--shadow); transition: all .2s; min-width: 0;
}
.mp-player.active { border-color: var(--pc, var(--accent)); box-shadow: 0 6px 20px color-mix(in srgb, var(--pc, var(--accent)) 38%, transparent); transform: translateY(-2px); }
.mp-player.won { border-color: var(--gold); background: color-mix(in srgb, var(--gold) 14%, var(--surface-1)); }
.mp-player.empty { opacity: .5; }
.mp-player-mark { font-size: 1.25rem; font-weight: 900; color: var(--pc, var(--accent)); }
.mp-player-name { font-weight: 800; font-size: .82rem; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.mp-grid {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: .6rem;
  width: min(84vw, 340px); aspect-ratio: 1;
  padding: .6rem; border-radius: 1.4rem;
  background: linear-gradient(160deg, color-mix(in srgb, var(--accent) 14%, var(--surface-2)), var(--surface-2));
  border: 1px solid var(--border); box-shadow: var(--shadow-lg);
}
.mp-grid.myturn { box-shadow: var(--shadow-lg), 0 0 0 3px var(--ring); }
.mp-cell {
  border-radius: 1rem; background: var(--surface-1); border: 1px solid var(--border);
  display: flex; align-items: center; justify-content: center;
  font-size: clamp(2rem, 12vw, 3.4rem); font-weight: 900; line-height: 1;
  box-shadow: inset 0 -3px 8px rgba(0,0,0,.05); transition: transform .12s, background .2s, box-shadow .2s;
}
.mp-cell:not(:disabled):hover { transform: translateY(-2px); background: color-mix(in srgb, var(--accent) 8%, var(--surface-1)); }
.mp-cell span { animation: mpPop .28s cubic-bezier(.34,1.56,.64,1); display: block; }
.mp-cell.x { color: var(--primary); }
.mp-cell.o { color: var(--accent); }
.mp-cell.win { background: color-mix(in srgb, var(--gold) 22%, var(--surface-1)); box-shadow: 0 0 0 2px var(--gold), 0 8px 20px color-mix(in srgb, var(--gold) 40%, transparent); }
@keyframes mpPop { from { transform: scale(0) rotate(-25deg); opacity: 0; } to { transform: scale(1) rotate(0); opacity: 1; } }

.mp-result {
  display: flex; flex-direction: column; align-items: center; gap: .6rem;
  background: var(--surface-1); border: 1px solid var(--border); box-shadow: var(--shadow-lg);
  border-radius: var(--radius); padding: 1.1rem 1.4rem; text-align: center; animation: mpPop .4s ease;
  width: 100%; max-width: 340px;
}
.mp-result-emoji { font-size: 2.6rem; }
.mp-result-txt { font-family: var(--font-d); font-size: 1.15rem; color: var(--text); }
.mp-wait { display: flex; align-items: center; gap: .5rem; color: var(--muted); font-weight: 800; font-size: .9rem; }
.mp-dot { width: 9px; height: 9px; border-radius: 50%; background: var(--accent); animation: mpPulse 1.1s ease infinite; }
@keyframes mpPulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.35;transform:scale(.6)} }
`;
