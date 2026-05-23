import { useRef } from "react";
import type { Room, Player } from "../types";

interface ResultScreenProps {
  room: Room;
  isHost: boolean;
  onRestart: () => void;
  onHome: () => void;
}

/* Deterministic confetti so it doesn't flicker on re-render */
const CONFETTI_COLORS = ["#FFD700", "#ff6b6b", "#4ecdc4", "#45b7d1", "#f9ca24", "#a29bfe", "#fd79a8", "#55efc4"];
const CONFETTI = Array.from({ length: 28 }, (_, i) => ({
  id: i,
  left: `${(i * 3.7) % 100}%`,
  delay: `${(i * 0.09) % 2.2}s`,
  duration: `${2.2 + (i % 5) * 0.4}s`,
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  size: 7 + (i % 4) * 3,
  round: i % 3 === 0,
}));

/* Podium heights & colours per rank */
const BAR_H   = [148, 104, 72];   // 1st | 2nd | 3rd
const BAR_CLR = ["#FFD700", "#C0C0C0", "#CD7F32"];
const MEDALS  = ["🥇", "🥈", "🥉", "4️⃣"];

/* Delay schedule (seconds) — 3rd rises first, 1st last = drama */
const BAR_DELAY   = [0.55, 0.30, 0.10]; // indexed by rank
const DROP_DELAY  = [0.95, 0.65, 0.45];
const MEDAL_DELAY = [1.35, 1.05, 0.85];

export function ResultScreen({ room, isHost, onRestart, onHome }: ResultScreenProps) {
  const scores  = room.scores || {};
  const allPlayers = Object.values(room.players || {});

  /* Sort: winner first (board games), then by score */
  const sorted: Player[] = [...allPlayers].sort((a, b) => {
    if (room.winner) {
      if (a.name === room.winner) return -1;
      if (b.name === room.winner) return 1;
    }
    return (scores[b.id] || 0) - (scores[a.id] || 0);
  });

  const hasScores = sorted.some(p => (scores[p.id] || 0) > 0);

  /* Classic podium display order: 2nd | 1st | 3rd */
  const top3 = sorted.slice(0, 3);
  const podiumOrder =
    top3.length >= 2
      ? [top3[1], top3[0], top3[2]].filter((x): x is Player => !!x)
      : top3;

  const fourth = sorted[3];
  const winner = sorted[0];

  return (
    <div className="screen podium-screen">

      {/* Confetti */}
      {CONFETTI.map(c => (
        <div
          key={c.id}
          className="confetti-piece"
          style={{
            left: c.left,
            animationDelay: c.delay,
            animationDuration: c.duration,
            background: c.color,
            width: c.size,
            height: c.size,
            borderRadius: c.round ? "50%" : "2px",
          }}
        />
      ))}

      {/* Header */}
      <div className="podium-header">
        <div className="podium-trophy">🏆</div>
        <h2 className="podium-title">Partie terminée !</h2>
        {winner && (
          <div className="podium-winner-name">
            {winner.emoji} <span style={{ color: winner.color || "#FFD700" }}>{winner.name}</span> gagne !
          </div>
        )}
      </div>

      {/* Podium stage */}
      <div className="podium-stage">
        {podiumOrder.map(p => {
          const rank = sorted.indexOf(p); // 0=1st, 1=2nd, 2=3rd
          const barH    = BAR_H[rank]   ?? 56;
          const barClr  = BAR_CLR[rank] ?? "#a0a0a0";
          const barDly  = BAR_DELAY[rank]   ?? 1;
          const dropDly = DROP_DELAY[rank]  ?? 1.2;
          const medDly  = MEDAL_DELAY[rank] ?? 1.6;

          return (
            <div key={p.id} className="podium-slot">
              {/* Player card — drops from above */}
              <div
                className="podium-player"
                style={{ animationDelay: `${dropDly}s` }}
              >
                <div className="podium-avatar">{p.emoji}</div>
                <div className="podium-pname" style={{ color: p.color || "#fff" }}>
                  {p.name}
                </div>
                <div
                  className="podium-medal"
                  style={{ animationDelay: `${medDly}s` }}
                >
                  {MEDALS[rank]}
                </div>
              </div>

              {/* Rising bar */}
              <div
                className="podium-bar"
                style={{
                  "--ph": `${barH}px`,
                  "--pc": barClr,
                  "--pd": `${barDly}s`,
                } as React.CSSProperties}
              >
                {hasScores && rank === 0 && (
                  <span className="podium-bar-score">{scores[p.id] || 0} pts</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Full ranking list */}
      <div className="podium-ranking">
        {sorted.map((p, i) => (
          <div
            key={p.id}
            className="podium-rank-row"
            style={{
              animationDelay: `${1.6 + i * 0.12}s`,
              borderLeftColor: p.color || "var(--accent)",
            }}
          >
            <span className="prr-medal">{MEDALS[i] || `${i + 1}.`}</span>
            <span className="prr-emoji">{p.emoji}</span>
            <span className="prr-name">{p.name}</span>
            {hasScores ? (
              <span className="prr-score">{scores[p.id] || 0} pts</span>
            ) : (
              i === 0 && <span className="prr-badge">🏆 Gagnant</span>
            )}
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="podium-actions">
        {isHost && (
          <button className="btn btn-primary" onClick={onRestart}>🔄 Rejouer</button>
        )}
        <button className="btn btn-ghost podium-home-btn" onClick={onHome}>🏠 Accueil</button>
      </div>
    </div>
  );
}
