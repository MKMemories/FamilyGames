import { useEffect } from "react";
import { motion } from "framer-motion";
import { fx } from "../lib/sound";
import { rankPoints, accumulate } from "../lib/party";
import type { Room, Player } from "../types";

interface ResultScreenProps {
  room: Room;
  isHost: boolean;
  canParty?: boolean;
  onRestart: () => void;
  onHome: () => void;
  onPartyStart?: () => void;
  onPartyNext?: () => void;
  onPartyEnd?: () => void;
}

/* Deterministic confetti + streamers so they don't reshuffle on re-render */
const CONFETTI_COLORS = ["#ffd54a", "#ff5b93", "#4ecdc4", "#7b5cff", "#ffb638", "#38d9a9", "#ff8fb1", "#63b3ff"];
const CONFETTI = Array.from({ length: 48 }, (_, i) => ({
  id: i,
  left: `${(i * 2.11) % 100}%`,
  delay: `${(i * 0.07) % 2.6}s`,
  duration: `${2.4 + (i % 6) * 0.4}s`,
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  size: 6 + (i % 4) * 3,
  streamer: i % 3 === 0,
  round: i % 4 === 0,
  drift: `${((i % 5) - 2) * 24}px`,
}));

const BAR_H = [150, 106, 74];
const BAR_CLR = ["linear-gradient(180deg,#ffe27a,#f0ab34)", "linear-gradient(180deg,#e6ecff,#aeb7d6)", "linear-gradient(180deg,#f0b98a,#c97f45)"];
const MEDALS = ["🥇", "🥈", "🥉", "4️⃣"];

export function ResultScreen({ room, isHost, canParty, onRestart, onHome, onPartyStart, onPartyNext, onPartyEnd }: ResultScreenProps) {
  useEffect(() => { fx("victory"); }, []);
  const allPlayers = Object.values(room.players || {});
  const partyInProgress = !!room.partyMode && !room.partyFinished;
  const partyDone = !!room.partyFinished;

  // Le grand podium final classe sur le CUMUL de soirée ; sinon sur le jeu.
  const scores = partyDone ? (room.partyScores || {}) : (room.scores || {});
  // Classement Soirée projeté (cumul + points de la manche en cours).
  const projectedParty = accumulate(room.partyScores || {}, rankPoints(room.scores || {}, allPlayers.map(p => p.id)));

  const sorted: Player[] = [...allPlayers].sort((a, b) => {
    if (room.winner) {
      if (a.name === room.winner) return -1;
      if (b.name === room.winner) return 1;
    }
    return (scores[b.id] || 0) - (scores[a.id] || 0);
  });

  const hasScores = sorted.some(p => (scores[p.id] || 0) > 0);
  const top3 = sorted.slice(0, 3);
  const podiumOrder =
    top3.length >= 2 ? [top3[1], top3[0], top3[2]].filter((x): x is Player => !!x) : top3;
  const winner = sorted[0];
  const isDraw = room.winner === "Égalité";

  return (
    <div className="screen podium-screen">
      <div className="podium-glow" />

      {CONFETTI.map(c => (
        <span
          key={c.id}
          className={`confetti-piece ${c.streamer ? "streamer" : ""}`}
          style={{
            left: c.left,
            animationDelay: c.delay,
            animationDuration: c.duration,
            background: c.color,
            width: c.streamer ? 4 : c.size,
            height: c.streamer ? c.size * 3.4 : c.size,
            borderRadius: c.round ? "50%" : "2px",
            ["--drift" as string]: c.drift,
          } as React.CSSProperties}
        />
      ))}

      {/* Header */}
      <div className="podium-header">
        <motion.div
          className="podium-trophy"
          initial={{ scale: 0, rotate: -25, y: -20 }}
          animate={{ scale: 1, rotate: 0, y: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 12, delay: 0.1 }}
        >
          <motion.span
            style={{ display: "inline-block" }}
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
          >
            {isDraw ? "🤝" : "🏆"}
          </motion.span>
        </motion.div>
        <motion.h2
          className="podium-title"
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          {partyDone ? "🎉 Soirée terminée !" : isDraw ? "Égalité !" : "Partie terminée !"}
        </motion.h2>
        {winner && !isDraw && (
          <motion.div
            className="podium-winner-name"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 18, delay: 0.45 }}
          >
            {winner.emoji} <span style={{ color: winner.color || "#FFD700" }}>{winner.name}</span> gagne !
          </motion.div>
        )}
      </div>

      {/* Podium stage */}
      <div className="podium-stage">
        {podiumOrder.map(p => {
          const rank = sorted.indexOf(p);
          const barH = BAR_H[rank] ?? 56;
          const barClr = BAR_CLR[rank] ?? "linear-gradient(180deg,#9aa0b8,#7a8098)";
          const dropDly = 0.5 + (2 - rank) * 0.18;
          return (
            <div key={p.id} className="podium-slot">
              <motion.div
                className="podium-player"
                initial={{ opacity: 0, y: -50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 320, damping: 18, delay: dropDly }}
              >
                <div className="podium-avatar" style={{ ["--pc" as string]: p.color }}>{p.emoji}</div>
                <div className="podium-pname" style={{ color: p.color || "#fff" }}>{p.name}</div>
                <motion.div
                  className="podium-medal"
                  initial={{ scale: 0, rotate: -20 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 12, delay: dropDly + 0.35 }}
                >
                  {MEDALS[rank]}
                </motion.div>
              </motion.div>
              <motion.div
                className="podium-bar"
                style={{ background: barClr }}
                initial={{ height: 0, opacity: 0.5 }}
                animate={{ height: barH, opacity: 1 }}
                transition={{ type: "spring", stiffness: 120, damping: 18, delay: dropDly + 0.1 }}
              >
                {hasScores && rank === 0 && (
                  <span className="podium-bar-score">{scores[p.id] || 0} pts</span>
                )}
              </motion.div>
            </div>
          );
        })}
      </div>

      {/* Full ranking list */}
      <motion.div
        className="podium-ranking"
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08, delayChildren: 1.3 } } }}
      >
        {sorted.map((p, i) => (
          <motion.div
            key={p.id}
            className="podium-rank-row"
            style={{ borderLeftColor: p.color || "var(--accent)" }}
            variants={{ hidden: { opacity: 0, x: -24 }, show: { opacity: 1, x: 0 } }}
          >
            <span className="prr-medal">{MEDALS[i] || `${i + 1}.`}</span>
            <span className="prr-emoji">{p.emoji}</span>
            <span className="prr-name">{p.name}</span>
            {hasScores ? (
              <span className="prr-score">{scores[p.id] || 0} pts</span>
            ) : (
              i === 0 && !isDraw && <span className="prr-badge">🏆 Gagnant</span>
            )}
          </motion.div>
        ))}
      </motion.div>

      {/* Classement de la soirée (pendant une soirée en cours) */}
      {partyInProgress && (
        <motion.div
          className="party-standings"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5 }}
        >
          <div className="party-standings-title">🎉 Classement de la soirée</div>
          {[...allPlayers].sort((a, b) => (projectedParty[b.id] || 0) - (projectedParty[a.id] || 0)).map((p, i) => (
            <div key={p.id} className="party-standings-row">
              <span className="psr-rank">{i + 1}.</span>
              <span className="psr-emoji">{p.emoji}</span>
              <span className="psr-name" style={{ color: p.color || "var(--text)" }}>{p.name}</span>
              <span className="psr-pts">{projectedParty[p.id] || 0} pts</span>
            </div>
          ))}
        </motion.div>
      )}

      {/* Actions */}
      <motion.div
        className="podium-actions"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.9 }}
      >
        {isHost && partyInProgress && (
          <>
            <button className="btn btn-primary" onClick={onPartyNext}>🎮 Jeu suivant →</button>
            <button className="btn btn-ghost" onClick={onPartyEnd}>🏁 Terminer la soirée</button>
          </>
        )}
        {isHost && !partyInProgress && (
          <>
            <button className="btn btn-primary" onClick={onRestart}>🔄 Rejouer</button>
            {!partyDone && canParty && (
              <button className="btn btn-accent" onClick={onPartyStart}>🎉 Soirée famille</button>
            )}
          </>
        )}
        {!isHost && partyInProgress && (
          <div className="waiting-host">⏳ L'hôte enchaîne la soirée…</div>
        )}
        <button className="btn btn-ghost podium-home-btn" onClick={onHome}>🏠 Accueil</button>
      </motion.div>

      <style>{`
        .party-standings{max-width:340px;margin:.4rem auto 0;width:calc(100% - 2rem);
          background:var(--surface-1);border:1px solid var(--border);border-radius:16px;padding:.7rem .9rem;box-shadow:var(--shadow);}
        .party-standings-title{font-family:var(--font-d);font-size:.95rem;text-align:center;margin-bottom:.45rem;color:var(--accent);}
        .party-standings-row{display:flex;align-items:center;gap:.5rem;padding:.22rem 0;font-weight:800;font-size:.9rem;}
        .psr-rank{color:var(--muted);width:22px;}
        .psr-name{flex:1;}
        .psr-pts{font-family:var(--font-d);color:var(--text);}
      `}</style>
    </div>
  );
}
