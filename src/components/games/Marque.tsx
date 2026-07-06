import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { dbRef, update } from "../../lib/firebase";
import { gameHistory } from "../../hooks/useGameHistory";
import { JokerBar } from "../JokerBar";
import { fx } from "../../lib/sound";
import { initJokers, jokerCount, speedBonus, type JokerType } from "../../lib/jokers";
import { pickBrand, buildOptions, monogram } from "../../lib/marquesData";
import type { Room, Brand } from "../../types";

const MK_JOKERS: JokerType[] = ["fifty", "double", "timeplus"];
const MK_TIMEPLUS_SEC = 6;
const TIMER_SEC = 16;
const TOTAL_ROUNDS = 10;
const mkHistory = gameHistory("marque");

/* Les indices se dévoilent progressivement (0→3) au fil du chrono.
   0 : silhouette + secteur · 1 : catégorie · 2 : monogramme · 3 : indice texte.
   Le NOM n'apparaît jamais avant la révélation. */
function clueStage(elapsed: number): number {
  if (elapsed >= 9) return 3;
  if (elapsed >= 6) return 2;
  if (elapsed >= 3) return 1;
  return 0;
}

interface Props { room: Room; roomId: string; playerId: string; isHost: boolean; isSolo: boolean; onLeave: () => void; }

export function Marque({ room, roomId, playerId, isHost, isSolo, onLeave }: Props) {
  const [timeLeft, setTimeLeft] = useState(TIMER_SEC);
  const [pending, setPending] = useState<string | null>(null);      // choix optimiste local
  const [fiftyHidden, setFiftyHidden] = useState<string[]>([]);
  const didPick = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const players = Object.values(room.players || {});
  const round = room.mkRound ?? 0;
  const total = room.mkTotalRounds ?? TOTAL_ROUNDS;
  const brand = (room.mkBrand ?? null) as Brand | null;
  const options = room.mkOptions ?? [];
  const answers = room.mkAnswers ?? {};
  const times = room.mkTimes ?? {};
  const revealed = room.mkRevealed ?? false;
  const scores = room.scores ?? {};
  const jokerActiveMap = room.jokerActive ?? {};
  const myJokerActive = jokerActiveMap[playerId] || null;

  const myAnswer = answers[playerId] !== undefined ? answers[playerId] : (pending ?? undefined);
  const submitted = answers[playerId] !== undefined || pending !== null;
  const elapsed = TIMER_SEC - timeLeft;
  const stage = revealed ? 3 : clueStage(elapsed);

  /* ── Host choisit la marche à suivre ── */
  useEffect(() => {
    if (!isHost || brand || didPick.current) return;
    didPick.current = true;
    pickAndSet();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, brand]);

  useEffect(() => {
    if (!isHost || room.jokers) return;
    update(dbRef(`games/${roomId}`), { jokers: initJokers(players.map(p => p.id), MK_JOKERS), jokerActive: {} });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, room.jokers]);

  const pickAndSet = async () => {
    const used = room.mkUsed ?? [];
    const b = pickBrand(used, mkHistory.getUsedSet());
    await update(dbRef(`games/${roomId}`), {
      mkBrand: b, mkOptions: buildOptions(b), mkAnswers: {}, mkTimes: {}, mkRevealed: false,
      mkUsed: [...used, b.id],
    });
  };

  /* ── Reset par manche ── */
  useEffect(() => {
    setPending(null); setFiftyHidden([]); didPick.current = false; setTimeLeft(TIMER_SEC);
  }, [round]);

  /* ── Chrono ── */
  useEffect(() => {
    if (!brand || revealed) { if (timerRef.current) clearInterval(timerRef.current); return; }
    setTimeLeft(TIMER_SEC);
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timerRef.current!); if (isHost) update(dbRef(`games/${roomId}`), { mkRevealed: true }); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brand?.id, revealed]);

  /* ── Révélation auto quand tout le monde a répondu ── */
  useEffect(() => {
    if (!brand || revealed || !isHost) return;
    if (players.length > 0 && players.every(p => answers[p.id] !== undefined)) update(dbRef(`games/${roomId}`), { mkRevealed: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers]);

  /* ── Gains : bonne réponse (10) + vitesse ⚡ (+3/+2/+1) ×2 joker Double. ── */
  const computeGains = (): Record<string, number> => {
    const correct = brand?.name;
    const rightOrder = players
      .filter(p => answers[p.id] === correct)
      .sort((a, b) => (times[a.id] ?? Infinity) - (times[b.id] ?? Infinity))
      .map(p => p.id);
    const gains: Record<string, number> = {};
    players.forEach(p => {
      let g = 0;
      if (answers[p.id] === correct) { g += 10; g += speedBonus(rightOrder.indexOf(p.id)); }
      if (jokerActiveMap[p.id] === "double") g *= 2;
      gains[p.id] = g;
    });
    return gains;
  };

  const answer = (opt: string) => {
    if (submitted || revealed || !brand) return;
    setPending(opt); fx(opt === brand.name ? "correct" : "select");
    update(dbRef(`games/${roomId}`), { [`mkAnswers/${playerId}`]: opt, [`mkTimes/${playerId}`]: Date.now() });
  };

  const useJoker = (type: JokerType) => {
    if (submitted || revealed || !brand) return;
    if (jokerCount(room.jokers, playerId, type) <= 0) return;
    const upd: Record<string, unknown> = { [`jokers/${playerId}/${type}`]: jokerCount(room.jokers, playerId, type) - 1 };
    if (type === "double") upd[`jokerActive/${playerId}`] = "double";
    else if (type === "timeplus") setTimeLeft(t => t + MK_TIMEPLUS_SEC);
    else if (type === "fifty") {
      const wrong = options.filter(o => o !== brand.name);
      setFiftyHidden(wrong.sort(() => Math.random() - 0.5).slice(0, 2));
    }
    update(dbRef(`games/${roomId}`), upd);
  };

  const nextRound = async () => {
    if (!brand) return;
    const gains = computeGains();
    const newScores = { ...scores };
    players.forEach(p => { newScores[p.id] = (newScores[p.id] || 0) + (gains[p.id] || 0); });
    mkHistory.saveSession([String(brand.id)]);
    const next = round + 1;
    if (next >= total) {
      const winner = [...players].sort((a, b) => (newScores[b.id] || 0) - (newScores[a.id] || 0))[0]?.name || "?";
      await update(dbRef(`games/${roomId}`), { scores: newScores, status: "finished", winner, mkRound: next });
    } else {
      await update(dbRef(`games/${roomId}`), {
        scores: newScores, mkRound: next, mkBrand: null, mkOptions: [], mkAnswers: {}, mkTimes: {}, mkRevealed: false, jokerActive: {},
      });
    }
  };

  const timerPct = (timeLeft / TIMER_SEC) * 100;
  const timerColor = timerPct > 55 ? "#4caf50" : timerPct > 28 ? "#ffbe42" : "#ff5252";

  if (!brand) {
    return (
      <div className="screen game-screen">
        <div className="game-topbar"><button className="btn-back" onClick={onLeave}>✕</button><div className="turn-indicator">🏷️ Devine la Marque</div><div /></div>
        <div className="quiz-loading"><div className="quiz-spinner" /><div>{isHost ? "Préparation…" : "En attente…"}</div></div>
        <style>{MK_CSS}</style>
      </div>
    );
  }

  const correct = brand.name;
  const gains = revealed ? computeGains() : {};
  const fastestId = players.filter(p => answers[p.id] === correct).sort((a, b) => (times[a.id] ?? Infinity) - (times[b.id] ?? Infinity))[0]?.id;

  return (
    <div className="screen game-screen mk-screen" style={{ ["--c1" as string]: brand.c1, ["--c2" as string]: brand.c2 }}>
      <div className="game-topbar">
        <button className="btn-back" onClick={onLeave}>✕</button>
        <div className="turn-indicator">🏷️ Marque {round + 1}/{total}</div>
        <div className="score-mini">{players.map(p => <span key={p.id} style={{ color: p.color || "#333" }}>{p.name.slice(0, 4)} {scores[p.id] || 0}</span>)}</div>
      </div>

      {!revealed && (
        <div className="quiz-timer-bar">
          <div className="quiz-timer-fill" style={{ width: `${timerPct}%`, background: timerColor }} />
          <span className="quiz-timer-num" style={{ color: timerColor }}>{timeLeft}s</span>
        </div>
      )}

      {/* Carte marque — indices progressifs */}
      <div className="mk-card">
        <span className="mk-aura" aria-hidden />
        <span className="mk-shine" aria-hidden />
        <AnimatePresence mode="wait">
          <motion.span key={`${brand.id}-${revealed ? "r" : stage >= 2}`} className="mk-mono"
            initial={{ scale: 0.6, opacity: 0, filter: "blur(6px)" }} animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
            transition={{ type: "spring", stiffness: 260, damping: 18 }}>
            {revealed || stage >= 2 ? monogram(brand) : "?"}
          </motion.span>
        </AnimatePresence>
        <span className="mk-sector" title="Secteur">{brand.emoji}</span>
      </div>

      {/* Indices dévoilés + progression */}
      <div className="mk-clues">
        <motion.div className={`mk-clue ${stage >= 1 ? "on" : ""}`} animate={{ opacity: stage >= 1 ? 1 : 0.4 }}>
          <span className="mk-clue-ic">🗂️</span>{stage >= 1 ? <b>{brand.category}</b> : <i>Catégorie…</i>}
        </motion.div>
        <motion.div className={`mk-clue ${stage >= 2 ? "on" : ""}`} animate={{ opacity: stage >= 2 ? 1 : 0.4 }}>
          <span className="mk-clue-ic">🔤</span>{stage >= 2 ? <b>Initiale « {monogram(brand)} »</b> : <i>Monogramme…</i>}
        </motion.div>
        <motion.div className={`mk-clue ${stage >= 3 ? "on" : ""}`} animate={{ opacity: stage >= 3 ? 1 : 0.4 }}>
          <span className="mk-clue-ic">💡</span>{stage >= 3 ? <b>{brand.hint}</b> : <i>Indice…</i>}
        </motion.div>
        {!revealed && <div className="mk-progress">{[0, 1, 2].map(i => <i key={i} className={stage > i ? "on" : ""} />)}</div>}
      </div>

      {!revealed ? (
        <div className="mk-options">
          {options.map(opt => {
            const hidden = fiftyHidden.includes(opt);
            const chosen = myAnswer === opt;
            return (
              <motion.button key={opt} className={`mk-opt ${chosen ? "chosen" : ""} ${hidden ? "gone" : ""}`}
                disabled={submitted || hidden} onClick={() => answer(opt)} whileTap={{ scale: 0.97 }}>
                {hidden ? "—" : opt}
              </motion.button>
            );
          })}
          {submitted && <div className="mk-waiting">✅ Réponse envoyée · {Object.keys(answers).length}/{players.length}</div>}
          <div style={{ marginTop: ".5rem" }}>
            <JokerBar types={MK_JOKERS} counts={(room.jokers || {})[playerId] || {}} active={myJokerActive} onUse={useJoker} />
          </div>
        </div>
      ) : (
        <div className="mk-reveal">
          <motion.div className="mk-answer" initial={{ scale: 0, rotate: -6 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 320, damping: 14 }}>
            C'était <strong>{brand.name}</strong> !
          </motion.div>
          <div className="mk-results">
            {players.map((p, i) => {
              const a = answers[p.id];
              const good = a === correct;
              return (
                <motion.div key={p.id} className={`mk-result ${good ? "good" : ""}`} style={{ borderLeftColor: p.color || "var(--accent)" }}
                  initial={{ opacity: 0, x: -18 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.1 }}>
                  <span className="mk-r-name">{p.emoji} {p.name}</span>
                  <span className="mk-r-ans">{a === undefined ? "⏰ —" : good ? "✅ " + a : "❌ " + a}</span>
                  {(gains[p.id] || 0) > 0 && <span className="mk-r-gain">+{gains[p.id]}{p.id === fastestId ? " ⚡" : ""}{jokerActiveMap[p.id] === "double" ? " ×2" : ""}</span>}
                </motion.div>
              );
            })}
          </div>
          {(isHost || isSolo)
            ? <button className="btn btn-primary" style={{ marginTop: "1rem", width: "100%" }} onClick={nextRound}>{round + 1 >= total ? "🏆 Voir le podium" : "Marque suivante →"}</button>
            : <div className="waiting-host">⏳ En attente de l'hôte…</div>}
        </div>
      )}

      <style>{MK_CSS}</style>
    </div>
  );
}

const MK_CSS = `
.mk-screen{max-width:560px;margin:0 auto;}
.mk-card{position:relative;width:min(74vw,240px);aspect-ratio:1.15;margin:.7rem auto .4rem;border-radius:26px;overflow:hidden;
  display:grid;place-items:center;background:linear-gradient(150deg,var(--c1),var(--c2));
  box-shadow:0 18px 44px color-mix(in srgb, var(--c1) 45%, transparent),inset 0 2px 0 rgba(255,255,255,.25),inset 0 -8px 18px rgba(0,0,0,.25);}
.mk-aura{position:absolute;width:120%;height:120%;background:radial-gradient(circle at 34% 26%, rgba(255,255,255,.35), transparent 55%);}
.mk-shine{position:absolute;top:-40%;left:-30%;width:50%;height:200%;transform:rotate(18deg);
  background:linear-gradient(100deg,transparent,rgba(255,255,255,.35),transparent);animation:mkShine 4.5s ease-in-out infinite;}
@keyframes mkShine{0%,100%{transform:translateX(-140%) rotate(18deg)}55%,100%{transform:translateX(360%) rotate(18deg)}}
@media (prefers-reduced-motion: reduce){.mk-shine{animation:none;}}
.mk-mono{position:relative;z-index:2;font-family:var(--font-d);font-size:clamp(3.4rem,17vw,6rem);line-height:1;color:#fff;
  text-shadow:0 4px 14px rgba(0,0,0,.4);letter-spacing:-.02em;}
.mk-sector{position:absolute;bottom:10px;right:12px;z-index:3;font-size:1.5rem;filter:drop-shadow(0 2px 4px rgba(0,0,0,.4));
  background:rgba(255,255,255,.9);width:38px;height:38px;border-radius:50%;display:grid;place-items:center;box-shadow:0 4px 10px rgba(0,0,0,.3);}

.mk-clues{max-width:340px;margin:.2rem auto .5rem;display:flex;flex-direction:column;gap:.3rem;}
.mk-clue{display:flex;align-items:center;gap:.5rem;font-size:.84rem;color:var(--text);background:var(--surface-1);
  border:1px solid var(--border);border-radius:12px;padding:.4rem .7rem;transition:opacity .3s,border-color .3s;}
.mk-clue.on{border-color:color-mix(in srgb, var(--c1) 45%, var(--border));box-shadow:0 4px 12px color-mix(in srgb, var(--c1) 18%, transparent);}
.mk-clue i{color:var(--muted);font-style:italic;font-weight:600;} .mk-clue b{color:var(--text);}
.mk-clue-ic{font-size:1rem;}
.mk-progress{display:flex;gap:.4rem;justify-content:center;margin-top:.15rem;}
.mk-progress i{width:26px;height:5px;border-radius:999px;background:var(--border);transition:background .3s;}
.mk-progress i.on{background:linear-gradient(90deg,var(--c1),var(--c2));}

.mk-options{max-width:360px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:.55rem;padding:0 .3rem;}
.mk-opt{padding:.85rem .6rem;border-radius:14px;font-weight:800;font-size:.92rem;color:var(--text);
  background:var(--surface-1);border:2px solid var(--border);box-shadow:var(--shadow);transition:transform .15s,border-color .15s,background .15s;}
.mk-opt:hover:not(:disabled){border-color:color-mix(in srgb,var(--c1) 55%,transparent);transform:translateY(-2px);}
.mk-opt.chosen{border-color:var(--accent);background:color-mix(in srgb,var(--accent) 14%,var(--surface-1));}
.mk-opt.gone{opacity:.25;}
.mk-opt:disabled{cursor:default;}
.mk-waiting{grid-column:1 / -1;text-align:center;font-weight:800;color:var(--green);font-size:.85rem;margin-top:.2rem;}

.mk-reveal{max-width:380px;margin:0 auto;width:100%;display:flex;flex-direction:column;align-items:center;padding:0 .3rem;}
.mk-answer{font-family:var(--font-d);font-size:1.4rem;color:#fff;background:linear-gradient(135deg,var(--c1),var(--c2));
  padding:.5rem 1.4rem;border-radius:1rem;margin:.2rem 0 .8rem;box-shadow:0 8px 22px color-mix(in srgb,var(--c1) 40%,transparent);}
.mk-answer strong{font-weight:900;}
.mk-results{width:100%;display:flex;flex-direction:column;gap:.4rem;}
.mk-result{display:flex;align-items:center;gap:.5rem;background:var(--surface-1);border:1px solid var(--border);
  border-left:4px solid var(--accent);border-radius:12px;padding:.5rem .7rem;}
.mk-result.good{background:color-mix(in srgb,var(--green) 12%,var(--surface-1));}
.mk-r-name{font-weight:800;flex:1;color:var(--text);}
.mk-r-ans{font-size:.82rem;font-weight:700;color:var(--muted);}
.mk-r-gain{font-family:var(--font-d);font-size:.82rem;color:var(--green);background:color-mix(in srgb,var(--green) 16%,transparent);padding:.05rem .4rem;border-radius:999px;}
`;
