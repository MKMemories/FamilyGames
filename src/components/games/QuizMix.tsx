import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { dbRef, update } from "../../lib/firebase";
import { gameHistory } from "../../hooks/useGameHistory";
import { JokerBar } from "../JokerBar";
import { fx } from "../../lib/sound";
import { initJokers, jokerCount, speedBonus, type JokerType } from "../../lib/jokers";
import { buildMixPlaylist, mixKey } from "../../lib/quizMixData";
import { BrandIcon, iconFor } from "./Marque";
import type { Room, MixRound } from "../../types";

const JOKERS: JokerType[] = ["fifty", "double", "timeplus"];
const TIMEPLUS = 7;
const TIMER = 18;
const TOTAL = 10;
const hist = gameHistory("quizmix");

interface Props { room: Room; roomId: string; playerId: string; isHost: boolean; isSolo: boolean; onLeave: () => void; }

export function QuizMix({ room, roomId, playerId, isHost, isSolo, onLeave }: Props) {
  const [pending, setPending] = useState<string | null>(null);
  const [priceGuess, setPriceGuess] = useState("");
  const [fiftyHidden, setFiftyHidden] = useState<string[]>([]);
  const [timeLeft, setTimeLeft] = useState(TIMER);
  const didBuild = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const players = Object.values(room.players || {});
  const rounds = (room.mixRounds || []) as MixRound[];
  const idx = room.mixIdx ?? 0;
  const total = rounds.length || TOTAL;
  const round: MixRound | null = rounds[idx] ?? null;
  const answers = room.mixAnswers ?? {};
  const times = room.mixTimes ?? {};
  const revealed = room.mixRevealed ?? false;
  const scores = room.scores ?? {};
  const jokerActiveMap = room.jokerActive ?? {};
  const myJokerActive = jokerActiveMap[playerId] || null;

  const isPrix = round?.type === "prix";
  const myAnswer = answers[playerId] !== undefined ? answers[playerId] : (isPrix ? undefined : pending ?? undefined);
  const submitted = answers[playerId] !== undefined || (!isPrix && pending !== null);
  const elapsed = TIMER - timeLeft;
  const stage = revealed ? 3 : elapsed >= 9 ? 3 : elapsed >= 6 ? 2 : elapsed >= 3 ? 1 : 0; // indices « marque »

  /* Hôte : construit la playlist mixte au démarrage */
  useEffect(() => {
    if (!isHost || rounds.length > 0 || didBuild.current) return;
    didBuild.current = true;
    const pl = buildMixPlaylist(TOTAL, hist.getUsedSet());
    update(dbRef(`games/${roomId}`), { mixRounds: pl, mixIdx: 0, mixAnswers: {}, mixTimes: {}, mixRevealed: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, rounds.length]);

  useEffect(() => {
    if (!isHost || room.jokers) return;
    update(dbRef(`games/${roomId}`), { jokers: initJokers(players.map(p => p.id), JOKERS), jokerActive: {} });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, room.jokers]);

  useEffect(() => { setPending(null); setPriceGuess(""); setFiftyHidden([]); setTimeLeft(TIMER); }, [idx]);

  useEffect(() => {
    if (!round || revealed) { if (timerRef.current) clearInterval(timerRef.current); return; }
    setTimeLeft(TIMER);
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timerRef.current!); if (isHost) update(dbRef(`games/${roomId}`), { mixRevealed: true }); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, revealed, round?.type]);

  useEffect(() => {
    if (!round || revealed || !isHost) return;
    if (players.length > 0 && players.every(p => answers[p.id] !== undefined)) update(dbRef(`games/${roomId}`), { mixRevealed: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers]);

  /* ── Gains partagés (bonne réponse / proximité + vitesse ⚡ ×2). ── */
  const computeGains = (): Record<string, number> => {
    const gains: Record<string, number> = {};
    if (!round) return gains;
    let winners: string[]; let exactId: string | null = null;
    if (isPrix && round.product) {
      const price = round.product.price;
      const diffs = players.map(p => ({ id: p.id, d: answers[p.id] !== undefined ? Math.abs(Number(answers[p.id]) - price) : Infinity }));
      const min = Math.min(...diffs.map(e => e.d));
      winners = diffs.filter(e => e.d === min && e.d !== Infinity).map(e => e.id);
      const ex = diffs.find(e => e.d <= 0.01); exactId = ex ? ex.id : null;
    } else {
      winners = players.filter(p => answers[p.id] === round.answer).map(p => p.id);
    }
    const order = winners.slice().sort((a, b) => (times[a] ?? Infinity) - (times[b] ?? Infinity));
    players.forEach(p => {
      let g = 0;
      if (winners.includes(p.id)) { g += 10; if (p.id === exactId) g += 15; g += speedBonus(order.indexOf(p.id)); }
      if (jokerActiveMap[p.id] === "double") g *= 2;
      gains[p.id] = g;
    });
    return gains;
  };

  const answerChoice = (opt: string) => {
    if (submitted || revealed || !round) return;
    setPending(opt); fx(opt === round.answer ? "correct" : "select");
    update(dbRef(`games/${roomId}`), { [`mixAnswers/${playerId}`]: opt, [`mixTimes/${playerId}`]: Date.now() });
  };
  const submitPrice = () => {
    if (submitted || revealed || !round) return;
    const v = parseFloat(priceGuess.replace(",", "."));
    if (isNaN(v) || v < 0) return;
    setPending("done"); fx("select");
    update(dbRef(`games/${roomId}`), { [`mixAnswers/${playerId}`]: String(v), [`mixTimes/${playerId}`]: Date.now() });
  };
  const useJoker = (type: JokerType) => {
    if (submitted || revealed || !round) return;
    if (jokerCount(room.jokers, playerId, type) <= 0) return;
    const upd: Record<string, unknown> = { [`jokers/${playerId}/${type}`]: jokerCount(room.jokers, playerId, type) - 1 };
    if (type === "double") upd[`jokerActive/${playerId}`] = "double";
    else if (type === "timeplus") setTimeLeft(t => t + TIMEPLUS);
    else if (type === "fifty" && round.options && round.options.length > 2) {
      const wrong = round.options.filter(o => o !== round.answer);
      setFiftyHidden(wrong.sort(() => Math.random() - 0.5).slice(0, 2));
    }
    update(dbRef(`games/${roomId}`), upd);
  };

  const nextRound = async () => {
    if (!round) return;
    const gains = computeGains();
    const newScores = { ...scores };
    players.forEach(p => { newScores[p.id] = (newScores[p.id] || 0) + (gains[p.id] || 0); });
    hist.saveSession([mixKey(round)]);
    const next = idx + 1;
    if (next >= total) {
      const winner = [...players].sort((a, b) => (newScores[b.id] || 0) - (newScores[a.id] || 0))[0]?.name || "?";
      await update(dbRef(`games/${roomId}`), { scores: newScores, status: "finished", winner, mixIdx: next });
    } else {
      await update(dbRef(`games/${roomId}`), { scores: newScores, mixIdx: next, mixAnswers: {}, mixTimes: {}, mixRevealed: false, jokerActive: {} });
    }
  };

  const timerPct = (timeLeft / TIMER) * 100;
  const timerColor = timerPct > 55 ? "#4caf50" : timerPct > 28 ? "#ffbe42" : "#ff5252";

  if (!round) {
    return (
      <div className="screen game-screen qm-screen">
        <div className="game-topbar"><button className="btn-back" onClick={onLeave}>✕</button><div className="turn-indicator">🧠 Quiz KHELIJ</div><div /></div>
        <div className="quiz-loading"><div className="quiz-spinner" /><div>{isHost ? "Préparation du grand mix…" : "En attente…"}</div></div>
        <style>{MIX_CSS}</style>
      </div>
    );
  }

  const b = round.brand;
  const fx1 = round.type === "marque" && b ? b.c1 : round.type === "vf" ? "#6366f1" : round.type === "prix" ? "#fb923c" : "#ec4899";
  const fx2 = round.type === "marque" && b ? b.c2 : round.type === "vf" ? "#818cf8" : round.type === "prix" ? "#fbbf24" : "#f472b6";
  const gains = revealed ? computeGains() : {};

  return (
    <div className="screen game-screen qm-screen" style={{ ["--fx" as string]: fx1, ["--fx2" as string]: fx2 }}>
      <span className="fx-aurora" aria-hidden />
      <div className="game-topbar">
        <button className="btn-back" onClick={onLeave}>✕</button>
        <div className="turn-indicator">Manche {idx + 1}/{total}</div>
        <div className="score-mini">{players.map(p => <span key={p.id} style={{ color: p.color || "#333" }}>{p.name.slice(0, 4)} {scores[p.id] || 0}</span>)}</div>
      </div>

      {!revealed && (
        <div className="quiz-timer-bar">
          <div className="quiz-timer-fill" style={{ width: `${timerPct}%`, background: timerColor }} />
          <span className="quiz-timer-num" style={{ color: timerColor }}>{timeLeft}s</span>
        </div>
      )}

      {/* Bandeau de format (change à chaque manche) */}
      <AnimatePresence mode="wait">
        <motion.div key={idx} className="qm-format" initial={{ y: -12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }}>
          {round.cat}{round.sub ? <span className="qm-sub"> · {round.sub}</span> : null}
        </motion.div>
      </AnimatePresence>

      {/* ── Corps selon le format ── */}
      {round.type === "marque" && b && (
        <div className="qm-brandcard" style={{ background: `linear-gradient(150deg, ${b.c1}, ${b.c2})` }}>
          <motion.div className="qm-illus" key={b.id} initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            style={{ filter: `blur(${revealed ? 0 : [11, 7, 3.5, 1.5][stage]}px)`, transition: "filter .6s ease" }}>
            <BrandIcon icon={iconFor(b)} />
          </motion.div>
          {!revealed && stage < 2 && <span className="qm-q">?</span>}
        </div>
      )}
      {(round.type === "qcm" || round.type === "vf") && (
        <motion.div className="qm-question" key={idx} initial={{ scale: 0.94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          {round.q}
        </motion.div>
      )}
      {round.type === "prix" && round.product && (
        <div className="qm-prix-card">
          <motion.div className="qm-prix-emoji" initial={{ scale: 0.5, rotate: -8, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }}>{round.product.emoji || "🛒"}</motion.div>
          <div className="qm-prix-title">{round.product.title}</div>
          {!revealed && <div className="qm-prix-ask">💬 À ton avis, combien ça coûte ?</div>}
        </div>
      )}

      {/* Zone de réponse */}
      {!revealed ? (
        isPrix ? (
          <div className="qm-prix-input">
            {submitted ? <div className="qm-sent">✅ Réponse envoyée · {Object.keys(answers).length}/{players.length}</div> : (
              <div className="qm-prix-row">
                <span className="qm-euro">€</span>
                <input className="qm-input" type="number" inputMode="decimal" placeholder="Prix estimé…" value={priceGuess}
                  onChange={e => setPriceGuess(e.target.value)} onKeyDown={e => e.key === "Enter" && submitPrice()} min="0" step="0.01" autoFocus />
                <button className="qm-go" onClick={submitPrice} disabled={!priceGuess}>→</button>
              </div>
            )}
            <div style={{ marginTop: ".5rem" }}><JokerBar types={["double", "timeplus"]} counts={(room.jokers || {})[playerId] || {}} active={myJokerActive} onUse={useJoker} /></div>
          </div>
        ) : (
          <div className={`qm-options ${round.type === "vf" ? "vf" : ""}`}>
            {(round.options || []).map(opt => {
              const hidden = fiftyHidden.includes(opt);
              const chosen = myAnswer === opt;
              const vfClass = round.type === "vf" ? (opt === "Vrai" ? "vrai" : "faux") : "";
              return (
                <motion.button key={opt} className={`qm-opt ${vfClass} ${chosen ? "chosen" : ""} ${hidden ? "gone" : ""}`}
                  disabled={submitted || hidden} onClick={() => answerChoice(opt)} whileTap={{ scale: 0.97 }}>
                  {round.type === "vf" && <span className="qm-vf-ic">{opt === "Vrai" ? "✔️" : "✖️"}</span>}{hidden ? "—" : opt}
                </motion.button>
              );
            })}
            {submitted && <div className="qm-sent">✅ Réponse envoyée · {Object.keys(answers).length}/{players.length}</div>}
            <div className="qm-jokers"><JokerBar types={round.options && round.options.length > 2 ? JOKERS : ["double", "timeplus"]} counts={(room.jokers || {})[playerId] || {}} active={myJokerActive} onUse={useJoker} /></div>
          </div>
        )
      ) : (
        <div className="qm-reveal">
          {isPrix && round.product ? (
            <>
              <motion.div className="qm-answer" initial={{ scale: 0 }} animate={{ scale: 1 }}>Prix réel : <strong>{round.product.price.toFixed(2)} €</strong></motion.div>
              {round.product.source && <div className="qm-src">📍 {round.product.country || "France"} · prix moyen indicatif · source : {round.product.source}</div>}
            </>
          ) : (
            <motion.div className="qm-answer" initial={{ scale: 0 }} animate={{ scale: 1 }}>Réponse : <strong>{round.type === "marque" ? round.brand?.name : round.answer}</strong></motion.div>
          )}
          {round.type === "vf" && round.explain && <div className="qm-explain">💡 {round.explain}</div>}
          <div className="qm-results">
            {players.map((p, i) => {
              const a = answers[p.id];
              const good = isPrix ? undefined : a === round.answer;
              const label = a === undefined ? "⏰ —" : isPrix ? `${Number(a).toFixed(2)} €` : (good ? "✅ " : "❌ ") + a;
              return (
                <motion.div key={p.id} className={`qm-res ${good ? "good" : ""}`} style={{ borderLeftColor: p.color || "var(--accent)" }}
                  initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 + i * 0.09 }}>
                  <span className="qm-res-name">{p.emoji} {p.name}</span>
                  <span className="qm-res-ans">{label}</span>
                  {(gains[p.id] || 0) > 0 && <span className="qm-res-gain">+{gains[p.id]}{jokerActiveMap[p.id] === "double" ? " ×2" : ""}</span>}
                </motion.div>
              );
            })}
          </div>
          {(isHost || isSolo)
            ? <button className="btn btn-primary" style={{ marginTop: "1rem", width: "100%" }} onClick={nextRound}>{idx + 1 >= total ? "🏆 Voir le classement" : "Manche suivante →"}</button>
            : <div className="waiting-host">⏳ En attente de l'hôte…</div>}
        </div>
      )}

      <style>{MIX_CSS}</style>
    </div>
  );
}

const MIX_CSS = `
.qm-screen{max-width:560px;margin:0 auto;position:relative;}
.qm-format{max-width:420px;margin:.5rem auto .2rem;text-align:center;font-family:var(--font-d);font-size:1.05rem;color:var(--text);}
.qm-format .qm-sub{font-family:var(--font-b);font-weight:800;font-size:.8rem;color:var(--muted);}
.qm-question{max-width:520px;margin:.4rem auto;width:calc(100% - 1.6rem);text-align:center;font-family:var(--font-d);font-size:1.35rem;line-height:1.3;
  color:var(--text);padding:1.3rem 1.1rem;border-radius:1.3rem;overflow:hidden;
  background:linear-gradient(150deg, color-mix(in srgb,var(--fx) 15%,var(--surface-1)), var(--surface-1));
  border:1.5px solid color-mix(in srgb,var(--fx) 30%,var(--border));box-shadow:0 14px 36px color-mix(in srgb,var(--fx) 20%,transparent);}

.qm-brandcard{position:relative;width:min(66vw,210px);aspect-ratio:1.1;margin:.5rem auto;border-radius:24px;overflow:hidden;display:grid;place-items:center;
  box-shadow:0 16px 40px color-mix(in srgb,var(--fx) 42%,transparent),inset 0 2px 0 rgba(255,255,255,.25);}
.qm-illus{width:100%;height:100%;display:grid;place-items:center;}
.qm-q{position:absolute;top:8px;left:12px;font-family:var(--font-d);font-size:1.6rem;color:rgba(255,255,255,.85);text-shadow:0 2px 6px rgba(0,0,0,.4);}

.qm-prix-card{max-width:420px;margin:.4rem auto;width:calc(100% - 1.6rem);text-align:center;padding:1rem;border-radius:1.3rem;
  background:linear-gradient(150deg, color-mix(in srgb,var(--fx) 14%,var(--surface-1)), var(--surface-1));border:1.5px solid color-mix(in srgb,var(--fx) 28%,var(--border));box-shadow:var(--shadow);}
.qm-prix-emoji{font-size:3.4rem;line-height:1;}
.qm-prix-title{font-family:var(--font-d);font-size:1.15rem;color:var(--text);margin-top:.3rem;}
.qm-prix-ask{font-size:.82rem;font-weight:700;color:var(--muted);margin-top:.4rem;}
.qm-prix-input{max-width:360px;margin:.6rem auto 0;width:calc(100% - 1.6rem);}
.qm-prix-row{display:flex;align-items:center;gap:.5rem;background:var(--surface-1);border:2px solid var(--border);border-radius:14px;padding:.4rem .5rem;}
.qm-euro{font-family:var(--font-d);font-size:1.3rem;color:var(--fx);padding-left:.3rem;}
.qm-input{flex:1;border:none;background:transparent;font-size:1.15rem;font-weight:800;color:var(--text);outline:none;}
.qm-go{border:none;border-radius:10px;width:44px;height:40px;color:#fff;font-size:1.2rem;font-weight:900;background:linear-gradient(135deg,var(--fx),var(--fx2));}
.qm-go:disabled{opacity:.5;}

.qm-options{max-width:420px;margin:.5rem auto 0;width:calc(100% - 1.6rem);display:grid;grid-template-columns:1fr 1fr;gap:.55rem;}
.qm-options.vf{grid-template-columns:1fr 1fr;gap:.7rem;}
.qm-opt{padding:.85rem .6rem;border-radius:14px;font-weight:800;font-size:.95rem;color:var(--text);background:var(--surface-1);
  border:2px solid var(--border);box-shadow:var(--shadow);transition:transform .15s,border-color .15s,background .15s;display:flex;align-items:center;justify-content:center;gap:.4rem;}
.qm-opt:hover:not(:disabled){transform:translateY(-2px);border-color:color-mix(in srgb,var(--fx) 55%,transparent);}
.qm-opt.chosen{border-color:var(--accent);background:color-mix(in srgb,var(--accent) 14%,var(--surface-1));}
.qm-opt.gone{opacity:.25;}
.qm-opt.vrai{border-color:color-mix(in srgb,#22c55e 40%,var(--border));} .qm-opt.vrai:hover:not(:disabled){border-color:#22c55e;}
.qm-opt.faux{border-color:color-mix(in srgb,#ef4444 40%,var(--border));} .qm-opt.faux:hover:not(:disabled){border-color:#ef4444;}
.qm-options.vf .qm-opt{padding:1.3rem .6rem;font-family:var(--font-d);font-size:1.2rem;}
.qm-vf-ic{font-size:1.1rem;}
.qm-sent{grid-column:1 / -1;text-align:center;font-weight:800;color:var(--green);font-size:.85rem;margin-top:.2rem;}
.qm-jokers{grid-column:1 / -1;margin-top:.5rem;}

.qm-reveal{max-width:420px;margin:.4rem auto 0;width:calc(100% - 1.6rem);display:flex;flex-direction:column;align-items:center;}
.qm-answer{font-family:var(--font-d);font-size:1.3rem;color:#fff;background:linear-gradient(135deg,var(--fx),var(--fx2));padding:.5rem 1.3rem;border-radius:1rem;margin:.2rem 0 .5rem;box-shadow:0 8px 22px color-mix(in srgb,var(--fx) 40%,transparent);}
.qm-src{font-size:.66rem;font-weight:700;color:var(--muted);text-align:center;margin-bottom:.6rem;max-width:320px;line-height:1.35;}
.qm-explain{font-size:.82rem;font-weight:700;color:var(--text);background:var(--surface-2);border-radius:12px;padding:.5rem .8rem;margin-bottom:.6rem;text-align:center;}
.qm-results{width:100%;display:flex;flex-direction:column;gap:.4rem;}
.qm-res{display:flex;align-items:center;gap:.5rem;background:var(--surface-1);border:1px solid var(--border);border-left:4px solid var(--accent);border-radius:12px;padding:.5rem .7rem;}
.qm-res.good{background:color-mix(in srgb,var(--green) 12%,var(--surface-1));}
.qm-res-name{font-weight:800;flex:1;color:var(--text);}
.qm-res-ans{font-size:.82rem;font-weight:700;color:var(--muted);}
.qm-res-gain{font-family:var(--font-d);font-size:.82rem;color:var(--green);background:color-mix(in srgb,var(--green) 16%,transparent);padding:.05rem .4rem;border-radius:999px;}
`;
