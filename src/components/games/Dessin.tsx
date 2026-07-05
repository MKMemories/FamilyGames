import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { dbRef, update } from "../../lib/firebase";
import { gameHistory } from "../../hooks/useGameHistory";
import { DrawingBoard } from "./DrawingBoard";
import type { Room, DrawPath, DessinGuessEntry } from "../../types";
import MOTS_RAW from "../../data/mots_dessin.json";

const MOTS: string[]  = MOTS_RAW as string[];
const ROUND_SEC       = 60;
const dessinHist      = gameHistory("dessin");

function normalize(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

/* ── Little celebratory particle burst (visual only) ── */
function Burst() {
  const bits = Array.from({ length: 11 });
  return (
    <div className="dessin-burst" aria-hidden>
      {bits.map((_, i) => {
        const angle = (i / bits.length) * Math.PI * 2;
        const dist  = 30 + (i % 3) * 10;
        return (
          <motion.span
            key={i}
            className="dessin-burst-bit"
            style={{ background: ["var(--green)", "var(--gold)", "var(--primary)"][i % 3] }}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{ x: Math.cos(angle) * dist, y: Math.sin(angle) * dist, opacity: 0, scale: 0.3 }}
            transition={{ duration: 0.75, ease: "easeOut" }}
          />
        );
      })}
    </div>
  );
}

/* ── Animated guessing dots for spectators ── */
function GuessDots() {
  return (
    <span className="dessin-dots" aria-hidden>
      {[0, 1, 2].map(i => (
        <motion.span
          key={i}
          className="dessin-dot"
          animate={{ opacity: [0.25, 1, 0.25], y: [0, -3, 0] }}
          transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.18, ease: "easeInOut" }}
        />
      ))}
    </span>
  );
}

interface DessinProps {
  room: Room;
  roomId: string;
  playerId: string;
  isHost: boolean;
  isSolo: boolean;
  onLeave: () => void;
}

export function Dessin({ room, roomId, playerId, isHost, isSolo, onLeave }: DessinProps) {
  const [guessText, setGuessText] = useState("");
  const [timeLeft, setTimeLeft]   = useState(ROUND_SEC);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const players        = Object.values(room.players || {});
  const manche         = room.dessinManche      ?? 0;
  const totalManches   = room.dessinTotalManches ?? players.length;
  const mot            = room.dessinMot         ?? null;
  const dessinateurId  = room.dessinDessinateur ?? null;
  const rawPaths = room.dessinPaths;
  const paths: DrawPath[] = Array.isArray(rawPaths) ? rawPaths : rawPaths ? Object.values(rawPaths as unknown as Record<string, DrawPath>) : [];
  const correctGuesser = room.dessinCorrectGuesser ?? null;
  const roundActive    = room.dessinRoundActive ?? false;
  const rawChat = room.dessinGuessChat;
  const guessChat: DessinGuessEntry[] = Array.isArray(rawChat) ? rawChat : rawChat ? Object.values(rawChat as unknown as Record<string, DessinGuessEntry>) : [];
  const scores         = room.scores ?? {};

  const amIDrawer     = dessinateurId === playerId;
  const currentDrawer = players.find(p => p.id === dessinateurId);
  const roundDone     = !roundActive && mot !== null;

  /* ── Timer ── */
  useEffect(() => {
    if (!roundActive) { if (timerRef.current) clearInterval(timerRef.current); return; }
    setTimeLeft(ROUND_SEC);
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          if (isHost) update(dbRef(`games/${roomId}`), { dessinRoundActive: false });
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [roundActive, mot]);

  /* ── Start a new manche (host) ── */
  const startManche = async () => {
    const used  = dessinHist.getUsedSet();
    const fresh = MOTS.filter(m => !used.has(m));
    const pool  = fresh.length >= 1 ? fresh : MOTS;
    const word  = pool[Math.floor(Math.random() * pool.length)];
    const drawerIdx = manche % players.length;
    const drawer    = players[drawerIdx];
    await update(dbRef(`games/${roomId}`), {
      dessinMot: word,
      dessinDessinateur: drawer?.id || players[0]?.id,
      dessinPaths: [],
      dessinCorrectGuesser: null,
      dessinRoundActive: true,
      dessinGuessChat: [],
    });
  };

  /* ── Stroke sync ── */
  const handleStrokeComplete = async (path: DrawPath) => {
    const current = Array.isArray(room.dessinPaths) ? room.dessinPaths : [];
    await update(dbRef(`games/${roomId}`), {
      dessinPaths: [...current, path].slice(-140),
    });
  };

  const handleClear = async () => {
    await update(dbRef(`games/${roomId}`), { dessinPaths: [] });
  };

  const handleUndo = async () => {
    const current = Array.isArray(room.dessinPaths) ? room.dessinPaths : [];
    await update(dbRef(`games/${roomId}`), { dessinPaths: current.slice(0, -1) });
  };

  /* ── Guess submission ── */
  const handleGuess = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = guessText.trim();
    if (!text || !mot || correctGuesser || !roundActive || amIDrawer) return;
    setGuessText("");
    const correct = normalize(text) === normalize(mot);
    const player  = players.find(p => p.id === playerId);
    const entry: DessinGuessEntry = {
      playerId, playerName: player?.name || "?", text, correct, ts: Date.now(),
    };
    const newChat = [...guessChat, entry].slice(-12);
    const upd: Record<string, any> = { dessinGuessChat: newChat };
    if (correct && !correctGuesser) {
      upd.dessinCorrectGuesser = playerId;
      upd.dessinRoundActive    = false;
      const newScores = { ...scores };
      newScores[playerId] = (newScores[playerId] || 0) + 10;
      if (dessinateurId) newScores[dessinateurId] = (newScores[dessinateurId] || 0) + 5;
      upd.scores = newScores;
    }
    await update(dbRef(`games/${roomId}`), upd);
  };

  /* ── Next manche (host) ── */
  const handleNextManche = async () => {
    if (mot) dessinHist.saveSession([mot]);
    const next = manche + 1;
    if (next >= totalManches) {
      const winner = [...players].sort((a, b) => (scores[b.id] || 0) - (scores[a.id] || 0))[0]?.name || "?";
      await update(dbRef(`games/${roomId}`), { status: "finished", winner, dessinManche: next, dessinRoundActive: false });
    } else {
      await update(dbRef(`games/${roomId}`), {
        dessinManche: next, dessinMot: null, dessinRoundActive: false,
        dessinPaths: [], dessinCorrectGuesser: null, dessinGuessChat: [],
      });
    }
  };

  /* ── Solo: just validate to move on ── */
  const handleSoloNext = async () => {
    if (mot) dessinHist.saveSession([mot]);
    const next = manche + 1;
    if (next >= totalManches) {
      await update(dbRef(`games/${roomId}`), { status: "finished", winner: players[0]?.name || "Solo", dessinManche: next });
    } else {
      await update(dbRef(`games/${roomId}`), {
        dessinManche: next, dessinMot: null, dessinRoundActive: false,
        dessinPaths: [], dessinGuessChat: [],
      });
    }
  };

  const timerPct   = (timeLeft / ROUND_SEC) * 100;
  const timerColor = timerPct > 55 ? "#4caf50" : timerPct > 28 ? "#ffbe42" : "#ff5252";

  /* ══ LOBBY / BETWEEN ROUNDS ══ */
  if (!mot) {
    const nextDrawer = players[manche % players.length];
    return (
      <div className="screen game-screen dessin-screen">
        <style>{DESSIN_CSS}</style>
        <div className="game-topbar">
          <button className="btn-back" onClick={onLeave}>✕</button>
          <div className="turn-indicator">🎨 Manche {manche + 1}/{totalManches}</div>
          <div className="score-mini">
            {players.map(p => (
              <span key={p.id} style={{ color: p.color }}>{p.name.slice(0, 4)} {scores[p.id] || 0}</span>
            ))}
          </div>
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            className="dessin-lobby"
            key={`lobby-${manche}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <motion.div
              className="dessin-lobby-icon"
              initial={{ scale: 0, rotate: -35 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 14 }}
            >
              🎨
            </motion.div>
            <motion.div
              className="dessin-lobby-title"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              Manche {manche + 1}
            </motion.div>
            <motion.div
              className="dessin-lobby-drawer"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 18 }}
            >
              <span className="dessin-lobby-emoji">{nextDrawer?.emoji}</span>{" "}
              <strong>{nextDrawer?.name}</strong> va dessiner !
            </motion.div>
            {(isHost || isSolo) ? (
              <motion.button
                className="btn btn-primary dessin-launch-btn"
                onClick={startManche}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.32 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                🚀 Lancer la manche !
              </motion.button>
            ) : (
              <motion.div
                className="waiting-host"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.32 }}
              >
                ⏳ L'hôte va lancer la manche…
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  /* ══ ACTIVE ROUND ══ */
  const correctGuesserPlayer = players.find(p => p.id === correctGuesser);

  return (
    <div className="screen game-screen dessin-screen">
      <style>{DESSIN_CSS}</style>
      <div className="game-topbar">
        <button className="btn-back" onClick={onLeave}>✕</button>
        <div className="turn-indicator">
          🎨 {amIDrawer ? "Tu dessines !" : `${currentDrawer?.emoji} ${currentDrawer?.name} dessine`}
        </div>
        <div className="score-mini">
          {players.map(p => (
            <span key={p.id} style={{ color: p.color }}>{p.name.slice(0, 4)} {scores[p.id] || 0}</span>
          ))}
        </div>
      </div>

      {/* Timer */}
      {roundActive && (
        <div className="quiz-timer-bar">
          <div className="quiz-timer-fill" style={{ width: `${timerPct}%`, background: timerColor }} />
          <span className="quiz-timer-num" style={{ color: timerColor }}>{timeLeft}s</span>
        </div>
      )}

      {/* Word display */}
      <AnimatePresence mode="wait">
        {amIDrawer && mot && (
          <motion.div
            className="dessin-word-banner"
            key="word-drawer"
            initial={{ opacity: 0, scale: 0.6, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.6 }}
            transition={{ type: "spring", stiffness: 320, damping: 16 }}
          >
            <span className="dessin-word-label">Ton mot :</span>
            <motion.span
              className="dessin-word"
              initial={{ letterSpacing: "0.4em", opacity: 0 }}
              animate={{ letterSpacing: "0.03em", opacity: 1 }}
              transition={{ delay: 0.12, duration: 0.35 }}
            >
              {mot}
            </motion.span>
          </motion.div>
        )}
        {!amIDrawer && !isSolo && roundActive && (
          <motion.div
            className="dessin-word-banner dessin-word-hidden"
            key="word-hidden"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <span>🔍 {String(mot.length)} lettres — devine le dessin</span>
            <GuessDots />
          </motion.div>
        )}
        {!amIDrawer && !isSolo && roundDone && (
          <motion.div
            className="dessin-word-banner"
            key="word-reveal"
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 17 }}
          >
            <span className="dessin-word-label">Le mot était :</span>
            <span className="dessin-word">{mot}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Canvas */}
      <DrawingBoard
        paths={paths}
        isDrawer={amIDrawer || isSolo}
        onStrokeComplete={handleStrokeComplete}
        onClear={handleClear}
        onUndo={handleUndo}
      />

      {/* Round result overlay */}
      <AnimatePresence>
        {roundDone && (
          <motion.div
            className={`dessin-round-result ${correctGuesserPlayer ? "dessin-result-win" : "dessin-result-timeout"}`}
            key="round-result"
            initial={{ opacity: 0, scale: 0.7, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ type: "spring", stiffness: 300, damping: 18 }}
          >
            {correctGuesserPlayer ? (
              <div className="dessin-correct">
                <span className="dessin-result-burst-wrap"><Burst /></span>
                <motion.span
                  className="dessin-result-emoji"
                  initial={{ scale: 0, rotate: -20 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 12, delay: 0.1 }}
                >
                  🎉
                </motion.span>{" "}
                <strong style={{ color: correctGuesserPlayer.color }}>{correctGuesserPlayer.name}</strong> a trouvé !
                {dessinateurId && <div style={{ fontSize: ".75rem", marginTop: ".2rem", color: "var(--muted)" }}>
                  {correctGuesserPlayer.name} +10pts · {currentDrawer?.name} +5pts
                </div>}
              </div>
            ) : (
              <div className="dessin-timeout">⏰ Temps écoulé ! Le mot était : <strong>{mot}</strong></div>
            )}
            {isSolo ? (
              <motion.button className="btn btn-primary dessin-result-btn" onClick={handleSoloNext}
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                {manche + 1 >= totalManches ? "🏆 Terminer" : "Mot suivant →"}
              </motion.button>
            ) : isHost ? (
              <motion.button className="btn btn-primary dessin-result-btn" onClick={handleNextManche}
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                {manche + 1 >= totalManches ? "🏆 Voir le podium" : "Manche suivante →"}
              </motion.button>
            ) : (
              <div className="waiting-host">⏳ En attente de l'hôte…</div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Guess chat (spectators) */}
      {!amIDrawer && !isSolo && roundActive && (
        <div className="dessin-guess-zone">
          <div className="dessin-chat">
            <AnimatePresence initial={false}>
              {guessChat.slice(-6).map((e) => (
                <motion.div
                  key={e.ts}
                  className={`dessin-chat-entry ${e.correct ? "dessin-chat-correct" : ""}`}
                  layout
                  initial={{ opacity: 0, y: 14, scale: 0.92 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 26 }}
                >
                  {e.correct && <Burst />}
                  <span className="dce-name">{e.playerName}</span>
                  <span className="dce-text">{e.correct ? `✅ ${e.text}` : e.text}</span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          <form className="dessin-guess-form" onSubmit={handleGuess}>
            <input
              ref={inputRef}
              type="text"
              className="dessin-guess-input"
              placeholder="Ta proposition…"
              value={guessText}
              onChange={e => setGuessText(e.target.value)}
              disabled={!!correctGuesser}
              autoFocus
            />
            <motion.button type="submit" className="btn btn-primary dessin-guess-btn"
              disabled={!guessText || !!correctGuesser}
              whileTap={{ scale: 0.9 }}>
              →
            </motion.button>
          </form>
        </div>
      )}

      {/* Guess chat for drawer (read only) */}
      {amIDrawer && roundActive && guessChat.length > 0 && (
        <div className="dessin-guess-zone dessin-drawer-chat">
          <div className="dessin-chat">
            <AnimatePresence initial={false}>
              {guessChat.slice(-5).map((e) => (
                <motion.div
                  key={e.ts}
                  className={`dessin-chat-entry ${e.correct ? "dessin-chat-correct" : ""}`}
                  layout
                  initial={{ opacity: 0, y: 14, scale: 0.92 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 26 }}
                >
                  {e.correct && <Burst />}
                  <span className="dce-name">{e.playerName}</span>
                  <span className="dce-text">{e.correct ? `✅ ${e.text}` : "💬 …"}</span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   Scoped premium styles for "Dessinez, c'est gagné"
   Visual / animation only — no layout or logic dependencies.
   Uses theme variables so it works in light AND dark.
══════════════════════════════════════════════════════════════ */
const DESSIN_CSS = `
/* ── Lobby ── */
.dessin-lobby-icon {
  filter: drop-shadow(0 6px 14px rgba(0,0,0,.18));
}
.dessin-lobby-title {
  font-family: var(--font-d);
  background: linear-gradient(135deg, var(--primary), var(--accent));
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent;
}
.dessin-lobby-drawer {
  background: color-mix(in srgb, var(--surface-1) 80%, transparent);
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: .5rem 1.1rem;
  box-shadow: var(--shadow);
  color: var(--text);
}
.dessin-lobby-drawer strong { color: var(--accent); }
.dessin-lobby-emoji { font-size: 1.15rem; }
.dessin-launch-btn { margin-top: 1rem; box-shadow: var(--shadow); }

/* ── Premium glassy toolbar ── */
.drawing-toolbar {
  background: color-mix(in srgb, var(--surface-1) 82%, transparent) !important;
  -webkit-backdrop-filter: blur(14px) saturate(1.5);
  backdrop-filter: blur(14px) saturate(1.5);
  border: 1px solid var(--border);
  border-radius: 1rem;
  box-shadow: var(--shadow);
}
.color-btn {
  box-shadow: 0 1px 3px rgba(0,0,0,.28), inset 0 1px 1px rgba(255,255,255,.35);
  transition: transform .16s cubic-bezier(.34,1.56,.64,1), box-shadow .16s;
}
.color-btn:hover { transform: scale(1.18); }
.color-btn.active {
  border-color: var(--surface-1) !important;
  transform: scale(1.22);
  box-shadow: 0 0 0 2.5px var(--accent), 0 2px 9px rgba(0,0,0,.3), inset 0 1px 1px rgba(255,255,255,.4);
}
.tool-btn {
  border: 1px solid transparent;
  transition: background .16s, border-color .16s, transform .12s, box-shadow .16s;
}
.tool-btn:hover { transform: translateY(-1px); }
.tool-btn.active {
  background: linear-gradient(135deg, rgba(var(--accent-rgb),.24), rgba(var(--accent-rgb),.1)) !important;
  border-color: rgba(var(--accent-rgb),.4);
  box-shadow: inset 0 0 0 1px rgba(var(--accent-rgb),.2), 0 2px 8px rgba(var(--accent-rgb),.18);
}

/* ── Word banner ── */
.dessin-word-banner {
  background: linear-gradient(135deg, rgba(var(--accent-rgb),.2), rgba(var(--accent-rgb),.06)) !important;
  border: 1px solid rgba(var(--accent-rgb),.28);
  border-radius: var(--radius-sm, .75rem);
  box-shadow: var(--shadow);
}
.dessin-word-banner.dessin-word-hidden {
  background: color-mix(in srgb, var(--text) 6%, transparent) !important;
  border-color: var(--border);
  color: var(--muted);
}
.dessin-word {
  font-family: var(--font-d);
  color: var(--accent) !important;
  text-shadow: 0 2px 10px rgba(var(--accent-rgb),.28);
}
.dessin-dots { display: inline-flex; gap: 4px; margin-left: 5px; align-items: center; }
.dessin-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--accent); display: inline-block;
}

/* ── Guess chat ── */
.dessin-guess-zone {
  background: color-mix(in srgb, var(--surface-1) 88%, transparent) !important;
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
}
.dessin-chat-entry {
  position: relative;
  padding: .18rem .5rem;
  border-radius: .55rem;
}
.dessin-chat-correct {
  color: var(--green) !important;
  background: linear-gradient(135deg, rgba(36,178,107,.22), rgba(36,178,107,.06));
  box-shadow: 0 0 0 1px rgba(36,178,107,.35), 0 0 16px rgba(36,178,107,.4);
}
.dessin-chat-correct .dce-name,
.dessin-chat-correct .dce-text { color: var(--green) !important; }
.dessin-guess-input {
  background: var(--bg) !important;
  border: 1.5px solid var(--border);
  color: var(--text) !important;
  transition: border-color .16s, box-shadow .16s;
}
.dessin-guess-input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(var(--accent-rgb),.18);
}

/* ── Round result card ── */
.dessin-round-result {
  position: relative; overflow: hidden;
  background: var(--surface-1) !important;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
}
.dessin-result-win {
  border-color: rgba(36,178,107,.5);
  box-shadow: var(--shadow), 0 0 26px rgba(36,178,107,.28);
}
.dessin-result-win::before {
  content: ""; position: absolute; inset: 0;
  background: linear-gradient(135deg, rgba(36,178,107,.14), transparent 60%);
  pointer-events: none;
}
.dessin-correct { position: relative; color: var(--green); }
.dessin-result-emoji { display: inline-block; font-size: 1.2rem; }
.dessin-result-burst-wrap {
  position: absolute; left: 50%; top: -2px; width: 0; height: 0;
}
.dessin-result-btn { margin-top: .7rem; }

/* ── Particle burst ── */
.dessin-burst {
  position: absolute; left: 50%; top: 50%;
  width: 0; height: 0; pointer-events: none; z-index: 3;
}
.dessin-burst-bit {
  position: absolute; left: 0; top: 0;
  width: 7px; height: 7px; border-radius: 2px;
  margin: -3.5px 0 0 -3.5px;
}

@media (prefers-reduced-motion: reduce) {
  .dessin-dot { animation: none !important; }
}
`;
