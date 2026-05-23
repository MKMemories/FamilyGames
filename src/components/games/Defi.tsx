import { useRef } from "react";
import { dbRef, update } from "../../lib/firebase";
import { DEFIS } from "../../lib/gameData";
import type { Room } from "../../types";

const TYPE_ICONS: Record<string, string> = { group: "👥", solo: "🎭", duo: "👫" };
const TYPE_LABELS: Record<string, string> = { group: "Tout le monde", duo: "En duo", solo: "Solo" };

interface DefiProps {
  room: Room;
  roomId: string;
  playerId: string;
  isHost: boolean;
  onLeave: () => void;
}

export function Defi({ room, roomId, playerId, isHost, onLeave }: DefiProps) {
  const players = Object.values(room.players || {});
  const defiIdx = room.defiIdx || 0;
  const defi = DEFIS[defiIdx % DEFIS.length];
  const timerLeft = room.timerLeft !== undefined ? room.timerLeft : defi.timer;
  const running = room.timerRunning || false;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimer = () => {
    update(dbRef(`games/${roomId}`), { timerRunning: true, timerLeft: defi.timer });
    if (timerRef.current) clearInterval(timerRef.current);
    let t = defi.timer;
    timerRef.current = setInterval(() => {
      t--;
      if (t <= 0) {
        clearInterval(timerRef.current!);
        update(dbRef(`games/${roomId}`), { timerRunning: false, timerLeft: 0 });
      } else {
        update(dbRef(`games/${roomId}`), { timerLeft: t });
      }
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    update(dbRef(`games/${roomId}`), { timerRunning: false });
  };

  const addPoints = (pid: string) => {
    const newScores = { ...(room.scores || {}), [pid]: ((room.scores || {})[pid] || 0) + 10 };
    update(dbRef(`games/${roomId}`), { scores: newScores });
  };

  const nextDefi = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    const next = defiIdx + 1;
    const nextDefiItem = DEFIS[next % DEFIS.length];
    if (next >= 10) {
      const scores = room.scores || {};
      const winner = players.sort((a, b) => (scores[b.id] || 0) - (scores[a.id] || 0))[0]?.name || "?";
      update(dbRef(`games/${roomId}`), { status: "finished", winner, defiIdx: next });
    } else {
      update(dbRef(`games/${roomId}`), { defiIdx: next, timerRunning: false, timerLeft: nextDefiItem.timer });
    }
  };

  return (
    <div className="screen game-screen defi-screen">
      <div className="game-topbar">
        <button className="btn-back" onClick={onLeave}>✕</button>
        <div className="turn-indicator">Défi {defiIdx + 1}</div>
        <div className="score-mini">
          {players.map(p => (
            <span key={p.id} style={{ color: p.color || "#333" }}>
              {p.name.slice(0, 4)} {(room.scores || {})[p.id] || 0}
            </span>
          ))}
        </div>
      </div>

      <div className="defi-card-wrap">
        <div className="defi-type-badge">
          {TYPE_ICONS[defi.type] || "⭐"} {TYPE_LABELS[defi.type] || defi.type}
        </div>
        <div className="defi-text">{defi.text}</div>
        <div className="defi-timer-wrap">
          <div className={`defi-timer ${running ? "running" : ""}`}>{timerLeft}s</div>
        </div>
        {isHost && !running && !room.winner && (
          <button className="btn btn-primary" onClick={startTimer}>▶ Lancer le chrono</button>
        )}
        {isHost && running && (
          <button className="btn btn-ghost" onClick={stopTimer}>⏸ Arrêter</button>
        )}
      </div>

      <div className="defi-score-btns">
        {players.map(p => (
          <button
            key={p.id}
            className="btn btn-score"
            style={{ borderColor: p.color || "#ccc" }}
            onClick={() => addPoints(p.id)}
          >
            +10 pts {p.name}
          </button>
        ))}
      </div>

      {isHost && (
        <div style={{ display: "flex", justifyContent: "center", padding: "0 1rem" }}>
          <button className="btn btn-accent" onClick={nextDefi}>Défi suivant →</button>
        </div>
      )}
    </div>
  );
}
