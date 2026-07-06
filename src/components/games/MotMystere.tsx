import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { dbRef, update } from "../../lib/firebase";
import { gameHistory } from "../../hooks/useGameHistory";
import { useSoloAI } from "../../hooks/useSoloAI";
import { fx } from "../../lib/sound";
import { WM_LEN, WM_SOLUTIONS, scoreGuess, keyStates, pickWord } from "../../lib/wordMysteryData";
import type { Room, Difficulty } from "../../types";

const MAX_TRIES = 6;
const ROUND_MS = 100_000;           // filet de sécurité : dévoile la manche après ~100 s
const hist = gameHistory("motmystere");
const KB_ROWS = ["AZERTYUIOP", "QSDFGHJKLM", "⏎WXCVBN⌫"];

interface Props { room: Room; roomId: string; playerId: string; isHost: boolean; isSolo: boolean; onLeave: () => void; }

export function MotMystere({ room, roomId, playerId, isHost, isSolo, onLeave }: Props) {
  const [cur, setCur] = useState("");
  const [shake, setShake] = useState(false);
  const roundTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const players = Object.values(room.players || {});
  const word = room.wmWord ?? null;
  const round = room.wmRound ?? 0;
  const total = room.wmTotalRounds ?? 6;
  const guessesBy = room.wmGuesses ?? {};
  const doneBy = room.wmDone ?? {};
  const solvedBy = room.wmSolved ?? {};
  const times = room.wmTimes ?? {};
  const revealed = room.wmRevealed ?? false;
  const used = room.wmUsed ?? [];
  const scores = room.scores ?? {};
  const aiId = room.aiId;
  const diff: Difficulty = (room.soloDifficulty as Difficulty) || "moyen";

  const myGuesses = guessesBy[playerId] ?? [];
  const myDone = !!doneBy[playerId];
  const nameOf = (id: string) => (id === aiId ? "Ordi" : (room.players || {})[id]?.name || "Joueur");

  const path = `games/${roomId}`;

  /* ── Hôte : tire un mot au début de chaque manche ── */
  useEffect(() => {
    if (!isHost || word || revealed || round >= total) return;
    const { word: w, idx } = pickWord(used, hist.getUsedSet());
    update(dbRef(path), { wmWord: w, wmUsed: [...used, idx], wmGuesses: {}, wmDone: {}, wmSolved: {}, wmTimes: {}, wmRevealed: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, word, revealed, round]);

  /* Réinitialise la saisie à chaque nouvelle manche. */
  useEffect(() => { setCur(""); }, [round, word]);

  /* ── Hôte : dévoile dès que tout le monde a terminé (+ filet anti-blocage). ── */
  useEffect(() => {
    if (!isHost || !word || revealed) return;
    if (players.length > 0 && players.every(p => doneBy[p.id])) {
      update(dbRef(path), { wmRevealed: true });
      return;
    }
    roundTimer.current = setTimeout(() => { update(dbRef(path), { wmRevealed: true }); }, ROUND_MS);
    return () => { if (roundTimer.current) clearTimeout(roundTimer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [word, revealed, JSON.stringify(doneBy), isHost]);

  /* ── Soumettre un essai (source unique par joueur). ── */
  const submitGuess = (pid: string, guess: string) => {
    if (!word || revealed || doneBy[pid]) return;
    const g = guess.toUpperCase();
    if (g.length !== WM_LEN || !/^[A-Z]+$/.test(g)) return;
    const prev = guessesBy[pid] ?? [];
    if (prev.length >= MAX_TRIES) return;
    const next = [...prev, g];
    const solved = g === word;
    const upd: Record<string, unknown> = { [`wmGuesses/${pid}`]: next };
    if (solved) { upd[`wmSolved/${pid}`] = next.length; upd[`wmTimes/${pid}`] = Date.now(); }
    if (solved || next.length >= MAX_TRIES) upd[`wmDone/${pid}`] = true;
    update(dbRef(path), upd);
    return solved;
  };

  const onKey = (k: string) => {
    if (myDone || revealed || !word) return;
    if (k === "⌫") { setCur(c => c.slice(0, -1)); return; }
    if (k === "⏎") {
      if (cur.length < WM_LEN) { setShake(true); fx("wrong"); setTimeout(() => setShake(false), 380); return; }
      const solved = submitGuess(playerId, cur);
      fx(solved ? "correct" : "tap");
      setCur("");
      return;
    }
    if (cur.length >= WM_LEN) return;
    setCur(c => c + k);
    fx("tap");
  };

  /* Clavier physique (confort desktop). */
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (myDone || revealed || !word) return;
      if (e.key === "Enter") onKey("⏎");
      else if (e.key === "Backspace") onKey("⌫");
      else { const c = e.key.toUpperCase(); if (/^[A-Z]$/.test(c)) onKey(c); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cur, myDone, revealed, word]);

  /* ── IA (solo) : devine avec un raisonnement plus ou moins fin selon la difficulté. ── */
  const aiActive = !!aiId && !!word && !revealed && !doneBy[aiId] && isHost;
  const aiGuessCount = (guessesBy[aiId ?? ""] ?? []).length;
  const smart = diff === "difficile" ? 0.92 : diff === "facile" ? 0.22 : 0.58;
  useSoloAI(aiActive, `${round}-${aiGuessCount}`, () => {
    if (!aiId || !word) return;
    const prev = guessesBy[aiId] ?? [];
    const tried = new Set(prev);
    const feedback = prev.map(g => ({ g, sc: scoreGuess(g, word) }));
    const consistent = WM_SOLUTIONS.filter(w =>
      !tried.has(w) && feedback.every(f => scoreGuess(f.g, w).join("") === f.sc.join(""))
    );
    const anyPool = WM_SOLUTIONS.filter(w => !tried.has(w));
    const useSmart = consistent.length > 0 && Math.random() < smart;
    const pool = useSmart ? consistent : anyPool;
    if (pool.length === 0) { submitGuess(aiId, word); return; } // sécurité : termine la manche
    submitGuess(aiId, pool[Math.floor(Math.random() * pool.length)]);
  }, 950);

  /* ── Gains de la manche (trouvé : base + bonus rapidité/essais). ── */
  const computeGains = (): Record<string, number> => {
    const gains: Record<string, number> = {};
    const order = players.filter(p => solvedBy[p.id] !== undefined).map(p => p.id)
      .sort((a, b) => (times[a] ?? Infinity) - (times[b] ?? Infinity));
    players.forEach(p => {
      const tries = solvedBy[p.id];
      let g = 0;
      if (tries !== undefined) {
        g = 25 + (MAX_TRIES - tries) * 8;
        const rank = order.indexOf(p.id);
        g += rank === 0 ? 15 : rank === 1 ? 10 : rank === 2 ? 6 : 3;
      }
      gains[p.id] = g;
    });
    return gains;
  };

  const nextRound = async () => {
    if (!word) return;
    const gains = computeGains();
    const newScores = { ...scores };
    players.forEach(p => { newScores[p.id] = (newScores[p.id] || 0) + (gains[p.id] || 0); });
    hist.saveSession([word]);
    const next = round + 1;
    if (next >= total) {
      const winner = [...players].sort((a, b) => (newScores[b.id] || 0) - (newScores[a.id] || 0))[0]?.name || "?";
      await update(dbRef(path), { scores: newScores, status: "finished", winner, wmRound: next });
    } else {
      await update(dbRef(path), { scores: newScores, wmRound: next, wmWord: null, wmGuesses: {}, wmDone: {}, wmSolved: {}, wmTimes: {}, wmRevealed: false });
    }
  };

  const kbState = word ? keyStates(myGuesses, word) : {};
  const doneCount = players.filter(p => doneBy[p.id]).length;

  if (!word) {
    return (
      <div className="screen game-screen wm-screen" style={{ ["--fx" as string]: "#0891b2", ["--fx2" as string]: "#22d3ee" }}>
        <span className="fx-aurora" aria-hidden />
        <div className="game-topbar"><button className="btn-back" onClick={onLeave}>✕</button><div className="turn-indicator">🔡 Le Mot Mystère</div><div /></div>
        <div className="quiz-loading"><div className="quiz-spinner" /><div>{isHost ? "Choix du mot…" : "En attente…"}</div></div>
        <style>{WM_CSS}</style>
      </div>
    );
  }

  return (
    <div className="screen game-screen wm-screen" style={{ ["--fx" as string]: "#0891b2", ["--fx2" as string]: "#22d3ee" }}>
      <span className="fx-aurora" aria-hidden />
      <div className="game-topbar">
        <button className="btn-back" onClick={onLeave}>✕</button>
        <div className="turn-indicator">Manche {Math.min(round + 1, total)}/{total}</div>
        <div className="score-mini">{players.map(p => <span key={p.id} style={{ color: p.color || "#333" }}>{p.name.slice(0, 4)} {scores[p.id] || 0}</span>)}</div>
      </div>

      {/* Statut des joueurs (sans divulguer les lettres) */}
      <div className="wm-status">
        {players.map(p => {
          const solved = solvedBy[p.id];
          const tries = (guessesBy[p.id] ?? []).length;
          const st = revealed ? (solved !== undefined ? `${solved}/6 ✅` : "❌") : doneBy[p.id] ? (solved !== undefined ? "✅" : "❌") : `${tries}/6`;
          return (
            <div key={p.id} className={`wm-chip ${doneBy[p.id] ? "done" : ""}`}>
              <span className="wm-chip-name" style={{ color: p.color || "var(--text)" }}>{nameOf(p.id).slice(0, 8)}</span>
              <span className="wm-chip-st">{st}</span>
            </div>
          );
        })}
      </div>

      {!revealed ? (
        <>
          {/* Ma grille */}
          <div className="wm-board">
            {Array.from({ length: MAX_TRIES }).map((_, r) => {
              const past = myGuesses[r];
              const isCurRow = r === myGuesses.length && !myDone;
              const sc = past ? scoreGuess(past, word) : null;
              return (
                <div key={r} className={`wm-row ${isCurRow && shake ? "shake" : ""}`}>
                  {Array.from({ length: WM_LEN }).map((_, c) => {
                    const letter = past ? past[c] : isCurRow ? (cur[c] ?? "") : "";
                    const state = sc ? sc[c] : "";
                    return (
                      <motion.div key={c} className={`wm-tile ${state ? "flip " + state : ""} ${!past && letter ? "typed" : ""}`}
                        initial={false} animate={past ? { rotateX: [0, 90, 0] } : {}}
                        transition={past ? { duration: 0.5, delay: c * 0.09 } : {}}>
                        {letter}
                      </motion.div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {myDone ? (
            <div className="wm-waitmsg">
              {solvedBy[playerId] !== undefined ? `🎉 Trouvé en ${solvedBy[playerId]} essai${solvedBy[playerId]! > 1 ? "s" : ""} !` : "😅 Manche terminée"}
              <span className="wm-wait-sub">⏳ {doneCount}/{players.length} joueurs prêts…</span>
            </div>
          ) : (
            <div className="wm-keyboard">
              {KB_ROWS.map((row, i) => (
                <div key={i} className="wm-krow">
                  {row.split("").map(k => {
                    const wide = k === "⏎" || k === "⌫";
                    const st = kbState[k];
                    return (
                      <button key={k} className={`wm-key ${wide ? "wide" : ""} ${st ? st : ""}`} onClick={() => onKey(k)}>
                        {k}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="wm-reveal">
          <motion.div className="wm-answer" initial={{ scale: 0 }} animate={{ scale: 1 }}>
            {room.wmWord?.split("").map((l, i) => <span key={i} className="wm-ans-tile">{l}</span>)}
          </motion.div>
          <div className="wm-recap">
            <AnimatePresence>
              {players.map((p, i) => {
                const gs = guessesBy[p.id] ?? [];
                const solved = solvedBy[p.id];
                const gains = computeGains()[p.id] || 0;
                return (
                  <motion.div key={p.id} className={`wm-recap-row ${solved !== undefined ? "won" : ""}`}
                    initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.09 }}>
                    <div className="wm-recap-head">
                      <span className="wm-recap-name" style={{ color: p.color || "var(--text)" }}>{p.emoji} {nameOf(p.id)}</span>
                      <span className="wm-recap-meta">{solved !== undefined ? `✅ ${solved}/6` : "❌"}{gains > 0 && <b className="wm-gain">+{gains}</b>}</span>
                    </div>
                    <div className="wm-mini">
                      {gs.map((g, gi) => (
                        <div key={gi} className="wm-mini-row">
                          {scoreGuess(g, room.wmWord || "").map((s, si) => <span key={si} className={`wm-dot ${s}`} />)}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
          {(isHost || isSolo)
            ? <button className="btn btn-primary" style={{ marginTop: "1rem", width: "100%" }} onClick={nextRound}>{round + 1 >= total ? "🏆 Voir le classement" : "Manche suivante →"}</button>
            : <div className="waiting-host">⏳ En attente de l'hôte…</div>}
        </div>
      )}

      <style>{WM_CSS}</style>
    </div>
  );
}

const WM_CSS = `
.wm-screen{max-width:520px;margin:0 auto;position:relative;}
.wm-status{display:flex;gap:.4rem;justify-content:center;flex-wrap:wrap;margin:.5rem 0 .3rem;}
.wm-chip{display:flex;flex-direction:column;align-items:center;gap:.05rem;padding:.3rem .6rem;border-radius:11px;background:var(--surface-1);border:1.5px solid var(--border);min-width:52px;}
.wm-chip.done{border-color:color-mix(in srgb,var(--fx) 55%,transparent);box-shadow:0 0 0 2px color-mix(in srgb,var(--fx) 22%,transparent);}
.wm-chip-name{font-size:.7rem;font-weight:900;}
.wm-chip-st{font-family:var(--font-d);font-size:.8rem;color:var(--fx);}

.wm-board{display:flex;flex-direction:column;gap:.42rem;align-items:center;margin:.6rem auto;}
.wm-row{display:flex;gap:.42rem;}
.wm-row.shake{animation:wmShake .38s;}
@keyframes wmShake{0%,100%{transform:translateX(0)}20%{transform:translateX(-7px)}40%{transform:translateX(7px)}60%{transform:translateX(-5px)}80%{transform:translateX(5px)}}
.wm-tile{width:clamp(44px,13vw,58px);height:clamp(44px,13vw,58px);display:grid;place-items:center;border-radius:12px;
  font-family:var(--font-d);font-size:1.7rem;font-weight:900;text-transform:uppercase;color:var(--text);
  background:var(--surface-1);border:2px solid var(--border);box-shadow:inset 0 -3px 6px rgba(0,0,0,.05);}
.wm-tile.typed{border-color:color-mix(in srgb,var(--fx) 60%,var(--border));animation:wmPop .12s ease;}
@keyframes wmPop{0%{transform:scale(.9)}100%{transform:scale(1)}}
.wm-tile.flip{color:#fff;border:none;box-shadow:0 4px 12px rgba(0,0,0,.16),inset 0 2px 0 rgba(255,255,255,.25);}
.wm-tile.flip.g{background:linear-gradient(150deg,#22c55e,#16a34a);}
.wm-tile.flip.y{background:linear-gradient(150deg,#f5b642,#eab308);}
.wm-tile.flip.x{background:linear-gradient(150deg,#7c8698,#5b6472);}

.wm-keyboard{max-width:460px;margin:.3rem auto 0;width:calc(100% - 1rem);display:flex;flex-direction:column;gap:.36rem;}
.wm-krow{display:flex;gap:.28rem;justify-content:center;}
.wm-key{flex:1;min-width:0;height:48px;border:none;border-radius:9px;background:var(--surface-2);color:var(--text);
  font-family:var(--font-b);font-weight:900;font-size:1rem;box-shadow:0 2px 0 rgba(0,0,0,.14);transition:transform .1s,background .2s;cursor:pointer;}
.wm-key:active{transform:translateY(2px);box-shadow:none;}
.wm-key.wide{flex:1.5;font-size:1.15rem;}
.wm-key.g{background:linear-gradient(150deg,#22c55e,#16a34a);color:#fff;}
.wm-key.y{background:linear-gradient(150deg,#f5b642,#eab308);color:#fff;}
.wm-key.x{background:#3a4150;color:rgba(255,255,255,.6);}

.wm-waitmsg{text-align:center;font-family:var(--font-d);font-size:1.2rem;color:var(--fx);margin:1rem auto;display:flex;flex-direction:column;gap:.3rem;}
.wm-wait-sub{font-family:var(--font-b);font-weight:800;font-size:.82rem;color:var(--muted);}

.wm-reveal{max-width:440px;margin:.4rem auto 0;width:calc(100% - 1rem);display:flex;flex-direction:column;align-items:center;}
.wm-answer{display:flex;gap:.35rem;margin:.3rem 0 .8rem;}
.wm-ans-tile{width:clamp(40px,11vw,50px);height:clamp(40px,11vw,50px);display:grid;place-items:center;border-radius:11px;
  font-family:var(--font-d);font-size:1.5rem;font-weight:900;color:#fff;background:linear-gradient(150deg,var(--fx),var(--fx2));
  box-shadow:0 6px 16px color-mix(in srgb,var(--fx) 40%,transparent);}
.wm-recap{width:100%;display:flex;flex-direction:column;gap:.5rem;}
.wm-recap-row{background:var(--surface-1);border:1px solid var(--border);border-radius:13px;padding:.55rem .7rem;}
.wm-recap-row.won{background:color-mix(in srgb,var(--green) 10%,var(--surface-1));border-color:color-mix(in srgb,var(--green) 30%,var(--border));}
.wm-recap-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:.35rem;}
.wm-recap-name{font-weight:900;font-size:.92rem;}
.wm-recap-meta{font-size:.8rem;font-weight:800;color:var(--muted);display:flex;align-items:center;gap:.4rem;}
.wm-gain{font-family:var(--font-d);color:var(--green);background:color-mix(in srgb,var(--green) 16%,transparent);padding:.05rem .4rem;border-radius:999px;}
.wm-mini{display:flex;flex-direction:column;gap:.18rem;}
.wm-mini-row{display:flex;gap:.18rem;}
.wm-dot{width:14px;height:14px;border-radius:4px;background:var(--border);}
.wm-dot.g{background:#22c55e;} .wm-dot.y{background:#eab308;} .wm-dot.x{background:#7c8698;}
`;
