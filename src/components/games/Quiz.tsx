import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { dbRef, update } from "../../lib/firebase";
import { QUIZ_BANK } from "../../lib/gameData";
import { categoryVisual } from "../../lib/categoryVisual";
import type { Room, StoredQuizQuestion } from "../../types";

/* ─── API types ─────────────────────────────────────────────── */
interface QuizzApiItem {
  question: string;
  answer: string;
  anecdote: string;
  difficulty: string;
  category: string;
  badAnswers: string[];
}
interface QuizzApiResponse {
  quizzes: QuizzApiItem[];
}

/* ─── localStorage history (avoid repeating questions) ──────── */
const HISTORY_KEY = "khelij_quiz_history";
const MAX_SESSIONS = 10;

interface QuizHistorySession {
  questions: string[];
  timestamp: number;
}

function loadHistory(): QuizHistorySession[] {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"); }
  catch { return []; }
}

function saveSession(questions: StoredQuizQuestion[]) {
  const history = loadHistory();
  history.unshift({ questions: questions.map(q => q.question), timestamp: Date.now() });
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_SESSIONS)));
}

function getUsedTexts(): Set<string> {
  const s = new Set<string>();
  loadHistory().forEach(h => h.questions.forEach(q => s.add(q)));
  return s;
}

/* ─── Fallback = the big curated French family bank ─────────── */
const FALLBACK_QUESTIONS: StoredQuizQuestion[] = QUIZ_BANK;

const TIMER_DURATION = 15;

/* Circular timer-ring geometry (r = 11) */
const RING_R = 11;
const RING_C = 2 * Math.PI * RING_R;

function shuffleArr<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

/* ─── Scoped premium styles (visual only) ───────────────────── */
const QUIZ_CSS = `
.quiz-question-wrap { will-change: transform, opacity; }

/* Progress bar glow */
.quiz-prog-bar {
  box-shadow: 0 0 10px color-mix(in srgb, var(--accent) 50%, transparent);
}

/* Timer bar + circular ring */
.quiz-timer-bar {
  height: 34px;
  overflow: hidden;
  background: color-mix(in srgb, var(--accent) 8%, var(--surface-1));
  border-bottom: 1px solid var(--border);
}
.quiz-timer-fill {
  height: 100%;
  opacity: .3;
  border-radius: 0;
  box-shadow: none;
}
.quiz-timer-ring {
  position: absolute;
  right: .55rem;
  top: 50%;
  transform: translateY(-50%);
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
}
.quiz-timer-ring svg { position: absolute; inset: 0; }
.qtr-track { fill: none; stroke: color-mix(in srgb, var(--text) 14%, transparent); stroke-width: 3; }
.qtr-prog  { fill: none; stroke-width: 3; }
.quiz-timer-ring .quiz-timer-num {
  position: static;
  right: auto;
  font-size: .66rem;
  line-height: 1;
}

/* Option buttons: flex layout + result marks */
.quiz-opt-btn {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: .6rem;
  position: relative;
  will-change: transform;
}
.qopt-text { flex: 1 1 auto; text-align: left; }
.qopt-mark {
  flex: 0 0 auto;
  width: 22px;
  height: 22px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  font-size: .8rem;
  font-weight: 900;
  color: #fff;
}
.qopt-mark.ok  { background: var(--green); }
.qopt-mark.bad { background: var(--danger); }

/* Reveal states get a premium glow */
.quiz-opt-btn.correct {
  border-color: var(--green);
  background: color-mix(in srgb, var(--green) 18%, var(--surface-1));
  color: var(--text);
  box-shadow: 0 6px 22px color-mix(in srgb, var(--green) 32%, transparent);
}
.quiz-opt-btn.wrong {
  border-color: var(--danger);
  background: color-mix(in srgb, var(--danger) 15%, var(--surface-1));
  color: var(--text);
}
.quiz-opt-btn.chosen {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 12%, var(--surface-1));
}

/* Loading polish */
.quiz-loading .quiz-spinner {
  box-shadow: 0 6px 20px color-mix(in srgb, var(--accent) 22%, transparent);
}

/* Category illustration tied to each question's topic */
.quiz-illus {
  position: relative; height: 78px; margin: .2rem 0 .1rem;
  display: flex; align-items: center; justify-content: center;
}
.quiz-illus-icon {
  width: 66px; height: 66px; border-radius: 50%; display: grid; place-items: center;
  font-size: 2.15rem; z-index: 2;
  background: radial-gradient(circle at 35% 28%,
    color-mix(in srgb, var(--cat, var(--accent)) 34%, var(--surface-1)),
    color-mix(in srgb, var(--cat, var(--accent)) 13%, var(--surface-1)));
  border: 1px solid color-mix(in srgb, var(--cat, var(--accent)) 45%, var(--border));
  box-shadow: 0 10px 26px color-mix(in srgb, var(--cat, var(--accent)) 40%, transparent),
    inset 0 1px 0 rgba(255,255,255,.45);
}
.quiz-float {
  position: absolute; top: 42%; transform: translateY(-50%);
  font-size: 1.15rem; opacity: .5; z-index: 1;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,.18));
}
/* Tint the category chip with the topic hue */
.quiz-cat {
  background: color-mix(in srgb, var(--cat, var(--accent)) 15%, transparent) !important;
  color: var(--cat, var(--accent)) !important;
  border: 1px solid color-mix(in srgb, var(--cat, var(--accent)) 34%, transparent);
}
`;

/* ─── Component ─────────────────────────────────────────────── */
interface QuizProps {
  room: Room;
  roomId: string;
  playerId: string;
  isHost: boolean;
  isSolo: boolean;
  onLeave: () => void;
}

export function Quiz({ room, roomId, playerId, isHost, isSolo, onLeave }: QuizProps) {
  const [isLoadingQ, setIsLoadingQ] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TIMER_DURATION);
  const [shuffledOpts, setShuffledOpts] = useState<string[]>([]);
  const [pendingAnswer, setPendingAnswer] = useState<string | null>(null); // optimistic local pick
  const didFetch = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const players = Object.values(room.players || {});
  const qIdx = room.questionIdx || 0;
  const questions = room.quizQuestions || [];
  const total = questions.length || 10;
  const currentQ: StoredQuizQuestion | null = questions[qIdx] ?? null;
  const quizAnswers = room.quizAnswers || {};
  // Prefer the authoritative answer; fall back to the optimistic local pick so
  // the button highlights instantly (no waiting on the Firebase round-trip).
  const myAnswer = quizAnswers[playerId] !== undefined ? quizAnswers[playerId] : (pendingAnswer ?? undefined);
  const revealed = room.revealed || false;
  const pct = total > 0 ? Math.round(qIdx / total * 100) : 0;

  /* ── Host fetches questions as soon as the game starts ── */
  useEffect(() => {
    if (!isHost || room.quizQuestions || didFetch.current) return;
    didFetch.current = true;
    fetchAndStore();
  }, [isHost, room.quizQuestions]);

  const fetchAndStore = async () => {
    setIsLoadingQ(true);
    const usedTexts = getUsedTexts();

    try {
      const res = await fetch(
        "https://quizzapi.jomoreschi.fr/api/v1/quizzes?limit=50&difficulty=normal"
      );
      if (!res.ok) throw new Error("API error");
      const data: QuizzApiResponse = await res.json();

      const all: StoredQuizQuestion[] = (data.quizzes || []).map(q => ({
        question: q.question,
        answer: q.answer,
        badAnswers: (q.badAnswers || []).slice(0, 3),
        category: q.category || "Culture générale",
      }));

      // Prefer questions not seen in the last 10 sessions
      const fresh = all.filter(q => !usedTexts.has(q.question));
      const pool = shuffleArr(fresh.length >= 10 ? fresh : all);
      const selected = pool.slice(0, 10);

      saveSession(selected);
      const opts = selected[0] ? shuffleArr([selected[0].answer, ...selected[0].badAnswers]) : [];
      await update(dbRef(`games/${roomId}`), {
        quizQuestions: selected,
        quizOptions: opts,
        totalQuestions: selected.length,
        questionIdx: 0,
        quizAnswers: {},
        revealed: false,
      });
    } catch {
      const usedTexts2 = getUsedTexts();
      const fresh = FALLBACK_QUESTIONS.filter(q => !usedTexts2.has(q.question));
      const pool2 = shuffleArr(fresh.length >= 5 ? fresh : FALLBACK_QUESTIONS).slice(0, 10);
      saveSession(pool2);
      const opts = shuffleArr([pool2[0].answer, ...pool2[0].badAnswers]);
      await update(dbRef(`games/${roomId}`), {
        quizQuestions: pool2,
        quizOptions: opts,
        totalQuestions: pool2.length,
        questionIdx: 0,
        quizAnswers: {},
        revealed: false,
      });
    } finally {
      setIsLoadingQ(false);
    }
  };

  /* ── Sync shuffled options from Firebase ── */
  useEffect(() => {
    if (room.quizOptions && room.quizOptions.length > 0) {
      setShuffledOpts(room.quizOptions);
    }
  }, [qIdx, room.quizOptions]);

  /* Clear the optimistic pick when the question changes. */
  useEffect(() => { setPendingAnswer(null); }, [qIdx]);

  /* ── Host reveals once EVERY player has answered (authoritative state) ── */
  useEffect(() => {
    if (!isHost || revealed || !currentQ) return;
    const answered = room.quizAnswers || {};
    if (players.length > 0 && players.every(p => answered[p.id] !== undefined)) {
      update(dbRef(`games/${roomId}`), { revealed: true });
    }
  }, [room.quizAnswers, isHost, revealed, currentQ?.question]);

  /* ── Countdown timer ── */
  useEffect(() => {
    if (!currentQ || revealed || myAnswer !== undefined) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    setTimeLeft(TIMER_DURATION);
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timerRef.current!); handleAnswer(""); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [qIdx, revealed, !!currentQ]);

  const handleAnswer = (chosen: string) => {
    if (myAnswer !== undefined || revealed || !currentQ) return;
    setPendingAnswer(chosen); // optimistic — instant highlight
    // Write to PER-PLAYER paths so simultaneous answers never clobber each other.
    const upd: Record<string, unknown> = { [`quizAnswers/${playerId}`]: chosen };
    if (chosen === currentQ.answer) upd[`scores/${playerId}`] = ((room.scores || {})[playerId] || 0) + 10;
    if (isSolo) upd.revealed = true;
    update(dbRef(`games/${roomId}`), upd);
  };

  const next = () => {
    const nextIdx = qIdx + 1;
    if (nextIdx >= total || !questions[nextIdx]) {
      const scores = room.scores || {};
      const winner = [...players].sort((a, b) => (scores[b.id] || 0) - (scores[a.id] || 0))[0]?.name || "?";
      update(dbRef(`games/${roomId}`), { status: "finished", winner, questionIdx: nextIdx });
    } else {
      const nextQ = questions[nextIdx];
      const opts = shuffleArr([nextQ.answer, ...nextQ.badAnswers]);
      update(dbRef(`games/${roomId}`), { questionIdx: nextIdx, quizAnswers: {}, revealed: false, quizOptions: opts });
    }
  };

  const getOptClass = (opt: string) => {
    if (myAnswer === undefined) return "";
    if (revealed) {
      if (opt === currentQ?.answer) return "correct";
      if (opt === myAnswer && opt !== currentQ?.answer) return "wrong";
    } else if (opt === myAnswer) return "chosen";
    return "";
  };

  const timerPct = (timeLeft / TIMER_DURATION) * 100;
  const timerColor = timerPct > 55 ? "#4caf50" : timerPct > 28 ? "#ffbe42" : "#ff5252";

  /* ══════════════════════════════════════════
     LOADING QUESTIONS
  ══════════════════════════════════════════ */
  if (isLoadingQ || !currentQ) {
    return (
      <div className="screen game-screen quiz-screen">
        <style>{QUIZ_CSS}</style>
        <div className="game-topbar">
          <button className="btn-back" onClick={onLeave}>✕</button>
          <div className="turn-indicator">🧠 Quiz KHELIJ</div>
          <div />
        </div>
        <motion.div
          className="quiz-loading"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <motion.div
            className="quiz-spinner"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 18 }}
          />
          <motion.div
            animate={{ opacity: [0.55, 1, 0.55] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          >
            {isHost ? "Chargement des questions…" : "En attente des questions…"}
          </motion.div>
        </motion.div>
      </div>
    );
  }

  /* ══════════════════════════════════════════
     ACTIVE QUIZ
  ══════════════════════════════════════════ */
  const ansDisabled = myAnswer !== undefined || revealed;
  const urgent = !revealed && myAnswer === undefined && timeLeft <= 5;
  const vis = categoryVisual(currentQ.category);

  /* Animation target for each option once the answer is revealed */
  const revealAnim = (cls: string) => {
    if (!revealed) return { opacity: 1, scale: 1, x: 0, y: 0 };
    if (cls === "correct") return { opacity: 1, scale: [1, 1.05, 1], x: 0, y: 0 };
    if (cls === "wrong") return { opacity: 1, scale: 1, x: [0, -8, 8, -6, 6, -3, 0], y: 0 };
    return { opacity: 0.42, scale: 0.98, x: 0, y: 0 };
  };

  return (
    <div className="screen game-screen quiz-screen">
      <style>{QUIZ_CSS}</style>
      <div className="game-topbar">
        <button className="btn-back" onClick={onLeave}>✕</button>
        <div className="turn-indicator">
          {isSolo ? "🎮 Solo" : "🧠 Quiz"} — {qIdx + 1}/{total}
        </div>
        <div className="score-mini">
          {players.map(p => (
            <span key={p.id} style={{ color: p.color || "#333" }}>
              {p.name.slice(0, 4)} {(room.scores || {})[p.id] || 0}
            </span>
          ))}
        </div>
      </div>

      <div className="quiz-progress">
        <motion.div
          className="quiz-prog-bar"
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>

      <div className="quiz-timer-bar">
        <motion.div
          className="quiz-timer-fill"
          initial={false}
          animate={{ width: `${timerPct}%`, background: timerColor }}
          transition={{ width: { duration: 1, ease: "linear" }, background: { duration: 0.4 } }}
        />
        <div className="quiz-timer-ring">
          <svg viewBox="0 0 26 26" width="26" height="26" aria-hidden="true">
            <circle className="qtr-track" cx="13" cy="13" r={RING_R} />
            <motion.circle
              className="qtr-prog"
              cx="13"
              cy="13"
              r={RING_R}
              transform="rotate(-90 13 13)"
              strokeLinecap="round"
              strokeDasharray={RING_C}
              style={{ stroke: timerColor }}
              initial={false}
              animate={{ strokeDashoffset: RING_C * (1 - timeLeft / TIMER_DURATION) }}
              transition={{ duration: 1, ease: "linear" }}
            />
          </svg>
          <motion.span
            className="quiz-timer-num"
            style={{ color: timerColor }}
            animate={urgent ? { scale: [1, 1.18, 1] } : { scale: 1 }}
            transition={urgent ? { duration: 0.7, repeat: Infinity, ease: "easeInOut" } : { duration: 0.2 }}
          >
            {timeLeft}
          </motion.span>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={qIdx}
          className="quiz-question-wrap"
          style={{ ["--cat" as string]: vis.hue } as React.CSSProperties}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -24 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="quiz-illus">
            {vis.floaters.map((f, i) => (
              <motion.span
                key={f + i}
                className="quiz-float"
                style={{ left: `${[7, 25, 71, 90][i] ?? 50}%` }}
                animate={{ y: [0, -11, 0], opacity: [0.4, 0.8, 0.4], rotate: [0, i % 2 ? 8 : -8, 0] }}
                transition={{ duration: 3 + i * 0.4, repeat: Infinity, ease: "easeInOut", delay: i * 0.3 }}
              >
                {f}
              </motion.span>
            ))}
            <motion.div
              className="quiz-illus-icon"
              initial={{ scale: 0, rotate: -25 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 380, damping: 14, delay: 0.05 }}
            >
              {vis.icon}
            </motion.div>
          </div>
          <motion.div
            className="quiz-cat"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 420, damping: 16, delay: 0.08 }}
          >
            {currentQ.category}
          </motion.div>
          <motion.div
            className="quiz-question"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.14, duration: 0.35, ease: "easeOut" }}
          >
            {currentQ.question}
          </motion.div>

          <div className="quiz-options">
            {shuffledOpts.map((opt, i) => {
              const cls = getOptClass(opt);
              return (
                <motion.button
                  key={i}
                  className={`quiz-opt-btn ${cls}`}
                  onClick={() => handleAnswer(opt)}
                  disabled={ansDisabled}
                  initial={{ opacity: 0, y: 16 }}
                  animate={revealAnim(cls)}
                  transition={
                    revealed
                      ? { duration: 0.45, ease: "easeOut" }
                      : { delay: 0.18 + i * 0.06, type: "spring", stiffness: 280, damping: 20 }
                  }
                  whileHover={ansDisabled ? undefined : { scale: 1.02, y: -2 }}
                  whileTap={ansDisabled ? undefined : { scale: 0.97 }}
                >
                  <span className="qopt-text">{opt}</span>
                  <AnimatePresence>
                    {revealed && cls === "correct" && (
                      <motion.span
                        key="ok"
                        className="qopt-mark ok"
                        initial={{ scale: 0, rotate: -40 }}
                        animate={{ scale: 1, rotate: 0 }}
                        exit={{ scale: 0 }}
                        transition={{ type: "spring", stiffness: 520, damping: 14, delay: 0.15 }}
                      >
                        ✓
                      </motion.span>
                    )}
                    {revealed && cls === "wrong" && (
                      <motion.span
                        key="bad"
                        className="qopt-mark bad"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        transition={{ type: "spring", stiffness: 520, damping: 14 }}
                      >
                        ✗
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
              );
            })}
          </div>

          <AnimatePresence mode="wait">
            {revealed ? (
              <motion.div
                key="reveal"
                className="quiz-reveal-zone"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                <div className="quiz-reveal-title">
                  ✅ Bonne réponse : <strong>{currentQ.answer}</strong>
                </div>
                {players.map((p, pi) => {
                  const ans = quizAnswers[p.id];
                  const ok = ans === currentQ.answer;
                  const noAns = ans === "" || ans === undefined;
                  return (
                    <motion.div
                      key={p.id}
                      className="quiz-player-ans"
                      style={{ color: p.color || "#333" }}
                      initial={{ opacity: 0, x: -14 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.12 + pi * 0.07, duration: 0.3 }}
                    >
                      {p.name} : {noAns ? "⏰ Temps écoulé" : ans}{" "}
                      {ok ? "✅" : noAns ? "😅" : "❌"}
                    </motion.div>
                  );
                })}
                {isHost || isSolo ? (
                  <motion.button
                    className="btn btn-primary"
                    style={{ marginTop: ".8rem" }}
                    onClick={next}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.12 + players.length * 0.07 + 0.05, duration: 0.3 }}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    {qIdx + 1 >= total ? "🏆 Voir les résultats" : "Question suivante →"}
                  </motion.button>
                ) : (
                  <div className="waiting-host">⏳ En attente de l'hôte…</div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="waiting"
                className="quiz-waiting"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
              >
                {isSolo ? "Choisis ta réponse !" : `${Object.keys(quizAnswers).length}/${players.length} ont répondu`}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
