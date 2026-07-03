import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  // Shuffled deck → no repeated challenges within a game.
  const deck = room.defiDeck && room.defiDeck.length ? room.defiDeck : DEFIS.map((_, i) => i);
  const defi = DEFIS[deck[defiIdx % deck.length]];
  const timerLeft = room.timerLeft !== undefined ? room.timerLeft : defi.timer;
  const running = room.timerRunning || false;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Transient UI only: floating "+10" bursts when a point is awarded.
  const [bursts, setBursts] = useState<{ id: number; pid: string }[]>([]);
  const burstSeq = useRef(0);
  const triggerBurst = (pid: string) => {
    const id = ++burstSeq.current;
    setBursts(b => [...b, { id, pid }]);
    setTimeout(() => setBursts(b => b.filter(x => x.id !== id)), 950);
  };

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
    const nextDefiItem = DEFIS[deck[next % deck.length]];
    if (next >= 10) {
      const scores = room.scores || {};
      const winner = players.sort((a, b) => (scores[b.id] || 0) - (scores[a.id] || 0))[0]?.name || "?";
      update(dbRef(`games/${roomId}`), { status: "finished", winner, defiIdx: next });
    } else {
      update(dbRef(`games/${roomId}`), { defiIdx: next, timerRunning: false, timerLeft: nextDefiItem.timer });
    }
  };

  // ── Circular countdown ring geometry (driven by existing timer state) ──
  const RING = 160;
  const STROKE = 13;
  const RADIUS = (RING - STROKE) / 2;
  const CIRC = 2 * Math.PI * RADIUS;
  const total = defi.timer || 1;
  const progress = Math.max(0, Math.min(1, timerLeft / total));
  const urgent = running && timerLeft > 0 && timerLeft <= 5;

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

      <AnimatePresence mode="wait">
        <motion.div
          key={defiIdx}
          className="defi-card-wrap"
          initial={{ opacity: 0, scale: 0.82, rotateX: -55, y: 26 }}
          animate={{ opacity: 1, scale: 1, rotateX: 0, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, rotateX: 40, y: -18 }}
          transition={{ type: "spring", stiffness: 260, damping: 22 }}
          style={{ transformPerspective: 900 }}
        >
          <motion.div
            className="defi-type-badge"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 520, damping: 15, delay: 0.14 }}
          >
            {TYPE_ICONS[defi.type] || "⭐"} {TYPE_LABELS[defi.type] || defi.type}
          </motion.div>

          <motion.div
            className="defi-illus"
            key={`illus-${defiIdx}`}
            initial={{ scale: 0, rotate: -22, y: 8 }}
            animate={{ scale: 1, rotate: 0, y: 0 }}
            transition={{ type: "spring", stiffness: 340, damping: 13, delay: 0.12 }}
          >
            <motion.span
              className="defi-illus-emoji"
              animate={{ y: [0, -7, 0] }}
              transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
            >
              {defi.emoji}
            </motion.span>
          </motion.div>

          <motion.div
            className="defi-text"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18, duration: 0.35 }}
          >
            {defi.text}
          </motion.div>

          <div className="defi-timer-wrap">
            <motion.div
              className={`defi-ring ${urgent ? "urgent" : ""}`}
              animate={urgent ? { scale: [1, 1.06, 1] } : { scale: 1 }}
              transition={urgent ? { duration: 0.7, repeat: Infinity, ease: "easeInOut" } : { duration: 0.2 }}
            >
              <svg width={RING} height={RING} viewBox={`0 0 ${RING} ${RING}`}>
                <defs>
                  <linearGradient id="defiRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="var(--primary)" />
                    <stop offset="100%" stopColor="var(--accent)" />
                  </linearGradient>
                </defs>
                <circle
                  className="defi-ring-track"
                  cx={RING / 2} cy={RING / 2} r={RADIUS}
                  fill="none" strokeWidth={STROKE}
                />
                <motion.circle
                  className="defi-ring-prog"
                  cx={RING / 2} cy={RING / 2} r={RADIUS}
                  fill="none" strokeWidth={STROKE} strokeLinecap="round"
                  stroke={urgent ? "var(--danger)" : "url(#defiRingGrad)"}
                  strokeDasharray={CIRC}
                  animate={{ strokeDashoffset: CIRC * (1 - progress) }}
                  transition={{ duration: running ? 0.95 : 0.4, ease: "linear" }}
                />
              </svg>
              <div className={`defi-ring-center ${running ? "running" : ""} ${urgent ? "urgent" : ""}`}>
                <span className="defi-ring-num">{timerLeft}</span>
                <span className="defi-ring-unit">sec</span>
              </div>
            </motion.div>
          </div>

          {isHost && !running && !room.winner && (
            <button className="btn btn-primary" onClick={startTimer}>▶ Lancer le chrono</button>
          )}
          {isHost && running && (
            <button className="btn btn-ghost" onClick={stopTimer}>⏸ Arrêter</button>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="defi-score-btns">
        {players.map(p => (
          <motion.button
            key={p.id}
            className="btn btn-score"
            style={{ borderColor: p.color || "#ccc", position: "relative" }}
            onClick={() => { addPoints(p.id); triggerBurst(p.id); }}
            whileTap={{ scale: 0.9 }}
            whileHover={{ y: -2 }}
            transition={{ type: "spring", stiffness: 500, damping: 20 }}
          >
            +10 pts {p.name}
            <AnimatePresence>
              {bursts.filter(b => b.pid === p.id).map(b => (
                <motion.span
                  key={b.id}
                  className="defi-burst"
                  style={{ color: p.color || "var(--green)" }}
                  initial={{ opacity: 0, y: 0, scale: 0.5 }}
                  animate={{ opacity: [0, 1, 1, 0], y: -42, scale: 1.2 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.9, ease: "easeOut" }}
                >
                  +10
                </motion.span>
              ))}
            </AnimatePresence>
          </motion.button>
        ))}
      </div>

      {isHost && (
        <div style={{ display: "flex", justifyContent: "center", padding: "0 1rem" }}>
          <button className="btn btn-accent" onClick={nextDefi}>Défi suivant →</button>
        </div>
      )}

      <style>{DEFI_CSS}</style>
    </div>
  );
}

/* Premium chrome for Défis Chrono. Reads the app's theme variables so it
   works in light and dark. Game logic/timer state is untouched — these
   styles only dress the presentation. */
const DEFI_CSS = `
.defi-ring {
  position: relative; display: inline-flex; align-items: center; justify-content: center;
  filter: drop-shadow(0 8px 20px rgba(var(--accent-rgb), .28));
}
.defi-ring.urgent { filter: drop-shadow(0 8px 22px rgba(240,69,94,.45)); }
.defi-ring svg { display: block; transform: rotate(-90deg); }
.defi-ring-track {
  stroke: var(--border);
  opacity: .9;
}
.defi-ring-center {
  position: absolute; inset: 0; display: flex; flex-direction: column;
  align-items: center; justify-content: center; line-height: 1;
}
.defi-ring-num {
  font-family: var(--font-d); font-size: 3rem; letter-spacing: -.02em;
  background: linear-gradient(135deg, var(--primary), var(--accent));
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  background-clip: text;
}
.defi-ring-center.urgent .defi-ring-num {
  background: none; -webkit-text-fill-color: var(--danger); color: var(--danger);
}
.defi-ring-unit {
  font-size: .72rem; font-weight: 900; text-transform: uppercase;
  letter-spacing: .18em; color: var(--muted); margin-top: .15rem;
}
.defi-ring-center.running.urgent .defi-ring-num { animation: defiUrgentBlink .6s steps(2) infinite; }
@keyframes defiUrgentBlink { 0%{opacity:1} 100%{opacity:.35} }

.defi-burst {
  position: absolute; top: 0; left: 50%; transform: translateX(-50%);
  font-family: var(--font-d); font-size: 1.4rem; font-weight: 900;
  pointer-events: none; text-shadow: 0 2px 8px rgba(0,0,0,.25); z-index: 3;
}

/* Big challenge illustration */
.defi-illus {
  width: 84px; height: 84px; margin: .3rem auto .1rem;
  border-radius: 50%; display: grid; place-items: center;
  background: radial-gradient(circle at 36% 30%,
    color-mix(in srgb, var(--primary) 26%, var(--surface-1)),
    color-mix(in srgb, var(--accent) 16%, var(--surface-1)));
  border: 1px solid color-mix(in srgb, var(--accent) 38%, var(--border));
  box-shadow: 0 12px 28px color-mix(in srgb, var(--accent) 34%, transparent),
    inset 0 1px 0 rgba(255,255,255,.45);
}
.defi-illus-emoji { font-size: 2.7rem; line-height: 1; filter: drop-shadow(0 3px 5px rgba(0,0,0,.2)); }
`;
