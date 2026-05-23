import { useState, useEffect, useRef } from "react";
import { dbRef, update } from "../../lib/firebase";
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

/* ─── Fallback questions ────────────────────────────────────── */
const FALLBACK_QUESTIONS: StoredQuizQuestion[] = [
  { question: "Quelle est la planète la plus proche du Soleil ?",         answer: "Mercure",     badAnswers: ["Vénus", "Mars", "Jupiter"],          category: "Sciences 🔭" },
  { question: "Combien de côtés a un hexagone ?",                         answer: "6",           badAnswers: ["4", "5", "8"],                        category: "Maths 🔢" },
  { question: "Quel est le plus grand pays du monde ?",                    answer: "Russie",      badAnswers: ["Canada", "États-Unis", "Chine"],       category: "Géographie 🗺️" },
  { question: "Qui a inventé la théorie de la relativité ?",              answer: "Einstein",    badAnswers: ["Newton", "Bohr", "Galilée"],           category: "Sciences 🔭" },
  { question: "Combien de joueurs dans une équipe de football ?",         answer: "11",          badAnswers: ["9", "10", "12"],                       category: "Sport ⚽" },
  { question: "Quelle est la capitale de l'Australie ?",                  answer: "Canberra",    badAnswers: ["Sydney", "Melbourne", "Brisbane"],     category: "Géographie 🗺️" },
  { question: "Quel animal est le plus rapide sur Terre ?",               answer: "Guépard",     badAnswers: ["Lion", "Autruche", "Faucon"],          category: "Nature 🌿" },
  { question: "En quelle année a commencé la Première Guerre mondiale ?", answer: "1914",        badAnswers: ["1910", "1918", "1939"],                category: "Histoire 📜" },
  { question: "Quelle est la formule chimique de l'eau ?",                answer: "H₂O",         badAnswers: ["CO₂", "O₂", "H₂O₂"],                 category: "Sciences 🔭" },
  { question: "Qui a écrit Roméo et Juliette ?",                          answer: "Shakespeare", badAnswers: ["Molière", "Victor Hugo", "Dante"],     category: "Littérature 📚" },
  { question: "De combien d'étoiles est composé le drapeau européen ?",   answer: "12",          badAnswers: ["15", "27", "6"],                       category: "Culture 🌍" },
  { question: "Quel est le plus grand océan du monde ?",                  answer: "Pacifique",   badAnswers: ["Atlantique", "Indien", "Arctique"],    category: "Géographie 🗺️" },
];

const TIMER_DURATION = 15;

function shuffleArr<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

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
  const didFetch = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const players = Object.values(room.players || {});
  const qIdx = room.questionIdx || 0;
  const questions = room.quizQuestions || [];
  const total = questions.length || 10;
  const currentQ: StoredQuizQuestion | null = questions[qIdx] ?? null;
  const quizAnswers = room.quizAnswers || {};
  const myAnswer = quizAnswers[playerId];
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
    const newAnswered = { ...quizAnswers, [playerId]: chosen };
    const newScores = { ...(room.scores || {}) };
    if (chosen === currentQ.answer) newScores[playerId] = (newScores[playerId] || 0) + 10;
    const allAnswered = players.every(p => newAnswered[p.id] !== undefined);
    const upd: any = { quizAnswers: newAnswered, scores: newScores };
    if (allAnswered || isSolo) upd.revealed = true;
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
        <div className="game-topbar">
          <button className="btn-back" onClick={onLeave}>✕</button>
          <div className="turn-indicator">🧠 Quiz KHELIJ</div>
          <div />
        </div>
        <div className="quiz-loading">
          <div className="quiz-spinner" />
          <div>{isHost ? "Chargement des questions…" : "En attente des questions…"}</div>
        </div>
      </div>
    );
  }

  /* ══════════════════════════════════════════
     ACTIVE QUIZ
  ══════════════════════════════════════════ */
  return (
    <div className="screen game-screen quiz-screen">
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
        <div className="quiz-prog-bar" style={{ width: `${pct}%` }} />
      </div>

      <div className="quiz-timer-bar">
        <div className="quiz-timer-fill" style={{ width: `${timerPct}%`, background: timerColor }} />
        <span className="quiz-timer-num" style={{ color: timerColor }}>{timeLeft}s</span>
      </div>

      <div className="quiz-question-wrap">
        <div className="quiz-cat">{currentQ.category}</div>
        <div className="quiz-question">{currentQ.question}</div>

        <div className="quiz-options">
          {shuffledOpts.map((opt, i) => (
            <button
              key={i}
              className={`quiz-opt-btn ${getOptClass(opt)}`}
              onClick={() => handleAnswer(opt)}
              disabled={myAnswer !== undefined || revealed}
            >
              {opt}
            </button>
          ))}
        </div>

        {revealed ? (
          <div className="quiz-reveal-zone">
            <div className="quiz-reveal-title">
              ✅ Bonne réponse : <strong>{currentQ.answer}</strong>
            </div>
            {players.map(p => {
              const ans = quizAnswers[p.id];
              const ok = ans === currentQ.answer;
              const noAns = ans === "" || ans === undefined;
              return (
                <div key={p.id} className="quiz-player-ans" style={{ color: p.color || "#333" }}>
                  {p.name} : {noAns ? "⏰ Temps écoulé" : ans}{" "}
                  {ok ? "✅" : noAns ? "😅" : "❌"}
                </div>
              );
            })}
            {isHost || isSolo ? (
              <button className="btn btn-primary" style={{ marginTop: ".8rem" }} onClick={next}>
                {qIdx + 1 >= total ? "🏆 Voir les résultats" : "Question suivante →"}
              </button>
            ) : (
              <div className="waiting-host">⏳ En attente de l'hôte…</div>
            )}
          </div>
        ) : (
          <div className="quiz-waiting">
            {isSolo ? "Choisis ta réponse !" : `${Object.keys(quizAnswers).length}/${players.length} ont répondu`}
          </div>
        )}
      </div>
    </div>
  );
}
