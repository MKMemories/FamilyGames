import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { dbRef, update } from "../../lib/firebase";
import { fx } from "../../lib/sound";
import type { Room } from "../../types";
import { useSoloAI } from "../../hooks/useSoloAI";
import { PB_CATEGORY_POOL, PB_LETTERS, pbStripAccents, pbAiAnswer } from "../../lib/petitBacData";
import { JokerBar } from "../JokerBar";
import { initJokers, jokerCount, type JokerType } from "../../lib/jokers";

const PB_JOKERS: JokerType[] = ["double", "timeplus"];
const PB_SPEED_BONUS = 5;   // ⚡ prime au premier joueur à finir (s'il a marqué)
const PB_TIMEPLUS_MS = 8000;

/* ══════════════════════════════════════════════════════════════════════════
   PETIT BAC (Baccalauréat) — party simultané (2–4 joueurs, chacun sur son écran)
   Une lettre + 6 catégories. Chacun remplit ses 6 réponses. Le premier à finir
   presse STOP → 10 s de grâce, puis on révèle. Réponse valide & unique = 10 pts,
   valide mais en double = 5 pts, vide/invalide = 0.

   État Firebase (lu via room.<champ>) :
     pbPhase "fill" | "reveal" | null   pbRound   pbTotalRounds (5)
     pbLetter   pbCategories[6]
     pbAnswers/<pid>/<catIdx>           pbDone/<pid>
     pbUsedLetters[]   pbStopBy   pbStopAt   scores
   ══════════════════════════════════════════════════════════════════════════ */

interface PetitBacProps {
  room: Room;
  roomId: string;
  playerId: string;
  isHost: boolean;
  isSolo: boolean;
  onLeave: () => void;
  onToast: (m: string) => void;
}

const GRACE_MS = 10000;

/* Première lettre significative sans accent (ignore espaces/apostrophes). */
function firstLetter(s: string): string {
  const t = pbStripAccents(s.trim());
  for (const ch of t) if (ch >= "a" && ch <= "z") return ch;
  return "";
}
function letterMatches(answer: string, letter: string): boolean {
  const a = answer.trim();
  if (!a) return false;
  const l = pbStripAccents(letter)[0] || "";
  return firstLetter(a) === l;
}

export function PetitBac({ room, roomId, playerId, isHost, isSolo, onLeave, onToast }: PetitBacProps) {
  /* ── Lectures défensives ── */
  const players = Object.values(room.players || {});
  const phase = room.pbPhase ?? null;               // null | "fill" | "reveal"
  const round = room.pbRound ?? 0;
  const totalRounds = room.pbTotalRounds ?? 5;
  const letter = room.pbLetter ?? "";
  const categories = room.pbCategories ?? [];
  const answers = room.pbAnswers ?? {};
  const done = room.pbDone ?? {};
  const usedLetters = room.pbUsedLetters ?? [];
  const stopBy = room.pbStopBy ?? null;
  const stopAt = room.pbStopAt ?? null;
  const scores = room.scores ?? {};

  const iAmDone = !!done[playerId];

  /* ── État UI transitoire ── */
  const [chosenRounds, setChosenRounds] = useState(5);
  const [myAnswers, setMyAnswers] = useState<Record<number, string>>({});
  const [now, setNow] = useState(Date.now());

  /* Gardes d'idempotence (par manche) */
  const revealRef = useRef(-1);
  const scoreRef = useRef(-1);
  const autoRef = useRef(-1);

  /* Horloge locale pour le compte à rebours (pas de reflow : slot fixe). */
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  /* Nouvelle manche → on remet à zéro les réponses locales. */
  useEffect(() => {
    setMyAnswers({});
    autoRef.current = -1;
  }, [round]);

  /* ── Utilitaires ── */
  const pickLetter = (used: string[]): string => {
    const avail = PB_LETTERS.filter((l) => !used.includes(l));
    const pool = avail.length > 0 ? avail : PB_LETTERS;
    return pool[Math.floor(Math.random() * pool.length)] ?? "A";
  };
  const pickCategories = (): string[] => {
    const shuffled = [...PB_CATEGORY_POOL].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 6);
  };
  const initScores = (): Record<string, number> => {
    const s: Record<string, number> = { ...scores };
    players.forEach((p) => { if (s[p.id] === undefined) s[p.id] = 0; });
    return s;
  };
  const buildMyAnswers = (): Record<string, string> => {
    const o: Record<string, string> = {};
    categories.forEach((_, ci) => { o[ci] = (myAnswers[ci] ?? "").trim(); });
    return o;
  };

  /* Points de la manche courante (déterministe depuis l'état → identique partout). */
  const roundPoints = (): Record<string, number> => {
    const pts: Record<string, number> = {};
    players.forEach((p) => { pts[p.id] = 0; });
    categories.forEach((_, ci) => {
      const norm: Record<string, string> = {};
      players.forEach((p) => {
        const a = (answers[p.id]?.[ci] ?? "").trim();
        if (a && letterMatches(a, letter)) norm[p.id] = pbStripAccents(a);
      });
      const vals = Object.values(norm);
      players.forEach((p) => {
        const v = norm[p.id];
        if (!v) return;
        const dup = vals.filter((x) => x === v).length > 1;
        pts[p.id] += dup ? 5 : 10;
      });
    });
    return pts;
  };

  /* Gain total d'un joueur pour la manche : base + prime de vitesse ⚡ (1er à
     finir) puis ×2 si le joker Double est actif. Déterministe → scoring = affichage. */
  const jokerActiveMap = room.jokerActive || {};
  const roundGain = (pid: string, base: number): number => {
    let g = base + (pid === stopBy && base > 0 ? PB_SPEED_BONUS : 0);
    if (jokerActiveMap[pid] === "double") g *= 2;
    return g;
  };

  /* Résultat détaillé d'une catégorie (pour l'affichage de la révélation). */
  const categoryResult = (ci: number) => {
    const norm: Record<string, string> = {};
    players.forEach((p) => {
      const a = (answers[p.id]?.[ci] ?? "").trim();
      if (a && letterMatches(a, letter)) norm[p.id] = pbStripAccents(a);
    });
    const vals = Object.values(norm);
    return players.map((p) => {
      const a = (answers[p.id]?.[ci] ?? "").trim();
      const v = norm[p.id];
      let status: "unique" | "dup" | "invalid" = "invalid";
      let pts = 0;
      if (v) {
        const dup = vals.filter((x) => x === v).length > 1;
        status = dup ? "dup" : "unique";
        pts = dup ? 5 : 10;
      }
      return { p, a, status, pts };
    });
  };

  /* ── Envoi des réponses (STOP manuel ou auto en fin de grâce) ── */
  const submit = () => {
    if (phase !== "fill" || done[playerId]) return;
    const payload: Record<string, unknown> = {
      [`pbAnswers/${playerId}`]: buildMyAnswers(),
      [`pbDone/${playerId}`]: true,
    };
    if (!stopBy) {
      payload.pbStopBy = playerId;
      payload.pbStopAt = Date.now() + GRACE_MS;
    }
    update(dbRef(`games/${roomId}`), payload);
  };

  /* ══════════════════════════════════════════════════════════════════════
     AUTO-ENVOI : quand la grâce expire, chaque client encore en course
     envoie ses réponses locales (aucune réponse perdue).
     ════════════════════════════════════════════════════════════════════════ */
  useEffect(() => {
    if (phase !== "fill" || !stopAt || iAmDone) return;
    if (now < stopAt) return;
    if (autoRef.current === round) return;
    autoRef.current = round;
    submit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now, stopAt, phase, iAmDone, round]);

  /* ══════════════════════════════════════════════════════════════════════
     HÔTE : fill → reveal quand tout le monde a terminé (ou grâce dépassée).
     ════════════════════════════════════════════════════════════════════════ */
  const allDone = players.length > 0 && players.every((p) => done[p.id]);
  const graceOver = !!stopAt && now > stopAt + 2500;
  useEffect(() => {
    if (!isHost || phase !== "fill" || players.length === 0) return;
    if (!allDone && !graceOver) return;
    if (revealRef.current === round) return;
    revealRef.current = round;
    update(dbRef(`games/${roomId}`), { pbPhase: "reveal" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, phase, round, allDone, graceOver]);

  /* ══════════════════════════════════════════════════════════════════════
     HÔTE : à l'entrée en reveal, calcule et écrit les scores cumulés (1 fois).
     ════════════════════════════════════════════════════════════════════════ */
  useEffect(() => {
    if (!isHost || phase !== "reveal") return;
    if (scoreRef.current === round) return;
    scoreRef.current = round;
    const rp = roundPoints();
    const newScores: Record<string, number> = { ...scores };
    players.forEach((p) => {
      newScores[p.id] = (newScores[p.id] || 0) + roundGain(p.id, rp[p.id] || 0);
    });
    update(dbRef(`games/${roomId}`), { scores: newScores });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, phase, round]);

  /* ══════════════════════════════════════════════════════════════════════
     ORDINATEUR (solo) : remplit ~4–5 catégories puis envoie.
     ════════════════════════════════════════════════════════════════════════ */
  const aiId = room.aiId;
  const aiActive = !!aiId && phase === "fill" && !done[aiId];
  const diff = room.soloDifficulty || "moyen";
  const aiDelay = diff === "facile" ? 8000 : diff === "difficile" ? 3200 : 5500;
  useSoloAI(aiActive, `${round}-fill`, () => {
    if (!aiId || phase !== "fill" || done[aiId]) return;
    const ans: Record<string, string> = {};
    categories.forEach((cat, ci) => { ans[ci] = pbAiAnswer(cat, letter); });
    // Difficulté : on laisse volontairement quelques cases vides.
    const blanks = diff === "facile" ? 2 : diff === "moyen" ? 1 : 0;
    const idxs = categories.map((_, i) => i).sort(() => Math.random() - 0.5);
    for (let k = 0; k < blanks && k < idxs.length; k++) ans[idxs[k]] = "";
    const payload: Record<string, unknown> = {
      [`pbAnswers/${aiId}`]: ans,
      [`pbDone/${aiId}`]: true,
    };
    if (!stopBy) {
      payload.pbStopBy = aiId;
      payload.pbStopAt = Date.now() + GRACE_MS;
    }
    update(dbRef(`games/${roomId}`), payload);
  }, aiDelay);

  /* ── Jokers (Double / Temps +) ── */
  const myJokerActive = jokerActiveMap[playerId] || null;
  const useJoker = (type: JokerType) => {
    if (phase !== "fill" || iAmDone) return;
    if (jokerCount(room.jokers, playerId, type) <= 0) return;
    const upd: Record<string, unknown> = {
      [`jokers/${playerId}/${type}`]: jokerCount(room.jokers, playerId, type) - 1,
    };
    if (type === "double") {
      upd[`jokerActive/${playerId}`] = "double";
    } else if (type === "timeplus") {
      if (!stopAt) return;                       // n'a de sens que pendant la grâce
      upd.pbStopAt = Math.max(stopAt, Date.now() + PB_TIMEPLUS_MS);
    }
    update(dbRef(`games/${roomId}`), upd);
  };

  /* ══════════════════════════════════════════════════════════════════════
     ACTIONS HÔTE
     ════════════════════════════════════════════════════════════════════════ */
  const startGame = () => {
    if (players.length < 2) { onToast("Il faut au moins 2 joueurs"); return; }
    const l = pickLetter([]);
    revealRef.current = -1;
    scoreRef.current = -1;
    update(dbRef(`games/${roomId}`), {
      pbPhase: "fill",
      pbRound: 1,
      pbTotalRounds: chosenRounds,
      pbLetter: l,
      pbCategories: pickCategories(),
      pbAnswers: {},
      pbDone: {},
      pbStopBy: null,
      pbStopAt: null,
      pbUsedLetters: [l],
      scores: initScores(),
      jokers: initJokers(players.map((p) => p.id), PB_JOKERS),
      jokerActive: {},
    });
  };

  const nextRound = () => {
    if (round < totalRounds) {
      const l = pickLetter(usedLetters);
      update(dbRef(`games/${roomId}`), {
        pbPhase: "fill",
        pbRound: round + 1,
        pbLetter: l,
        pbCategories: pickCategories(),
        pbAnswers: {},
        pbDone: {},
        pbStopBy: null,
        pbStopAt: null,
        pbUsedLetters: [...usedLetters, l],
        jokerActive: {},
      });
    } else {
      const winner =
        [...players].sort((a, b) => (scores[b.id] || 0) - (scores[a.id] || 0))[0]?.name || "?";
      update(dbRef(`games/${roomId}`), { status: "finished", winner, scores });
    }
  };

  /* Décompte de grâce affiché (secondes restantes). */
  const countdown = stopAt ? Math.max(0, Math.ceil((stopAt - now) / 1000)) : null;
  const doneCount = players.filter((p) => done[p.id]).length;

  /* ══════════════════════════════════════════════════════════════════════
     RENDER
     ════════════════════════════════════════════════════════════════════════ */

  /* ── Écran de démarrage ── */
  if (phase === null) {
    return (
      <div className="screen game-screen pb-screen" style={{ ["--fx" as string]: "#0ea5e9", ["--fx2" as string]: "#38bdf8" }}>
        <span className="fx-aurora" aria-hidden />
        <Topbar round={round} totalRounds={totalRounds} onLeave={onLeave} started={false}
                players={players} scores={scores} />
        <div className="pb-start">
          <div className="pb-start-badge">🅰️</div>
          <h1 className="pb-start-title">Petit Bac</h1>
          <p className="pb-start-sub">
            Une lettre, six catégories. Remplis vite et bien ! Réponse originale = 10 points,
            réponse en double = 5 points. Le premier à finir presse <b>STOP</b> et lance
            le compte à rebours.
          </p>

          {isHost ? (
            <>
              <div className="pb-rounds-pick">
                <span className="pb-rounds-label">Nombre de manches</span>
                <div className="pb-rounds-btns">
                  {[3, 5, 7].map((n) => (
                    <button
                      key={n}
                      className={`pb-round-chip ${chosenRounds === n ? "sel" : ""}`}
                      onClick={() => setChosenRounds(n)}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <button className="pb-btn pb-btn-primary" onClick={startGame}>Commencer →</button>
              {players.length < 2 && (
                <div className="pb-hint">Il faut au moins 2 joueurs pour lancer la partie.</div>
              )}
            </>
          ) : (
            <div className="pb-waiting"><span className="pb-dot-pulse" /> En attente de l'hôte…</div>
          )}
          {isSolo && <div className="pb-hint">Mode solo : tu affrontes l'ordinateur 🤖</div>}
        </div>
        <style>{PB_CSS}</style>
      </div>
    );
  }

  /* ── Phase FILL ── */
  if (phase === "fill") {
    return (
      <div className="screen game-screen pb-screen" style={{ ["--fx" as string]: "#0ea5e9", ["--fx2" as string]: "#38bdf8" }}>
        <span className="fx-aurora" aria-hidden />
        <Topbar round={round} totalRounds={totalRounds} onLeave={onLeave} started
                players={players} scores={scores} />

        <div className="pb-letter-wrap">
          <motion.div
            key={letter + round}
            className="pb-letter-badge"
            initial={{ scale: 0, rotate: -18 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 15 }}
          >
            {letter}
          </motion.div>
          <div className="pb-letter-caption">Tous les mots commencent par cette lettre</div>
        </div>

        {/* Slot de statut à hauteur fixe (aucun saut de mise en page) */}
        <div className="pb-status-slot">
          {stopBy ? (
            <div className={`pb-grace ${countdown !== null && countdown <= 3 ? "urgent" : ""}`}>
              <span className="pb-grace-emoji">⏱️</span>
              {iAmDone
                ? <>Réponses envoyées — <b>{countdown}s</b> avant la révélation</>
                : <>STOP ! Termine vite : <b>{countdown}s</b></>}
            </div>
          ) : (
            <div className="pb-status-idle">{doneCount}/{players.length} ont terminé</div>
          )}
        </div>

        {iAmDone ? (
          <div className="pb-done-card">
            <div className="pb-done-check">✓</div>
            <div className="pb-done-txt">Tes réponses sont envoyées !</div>
            <div className="pb-done-sub">
              {countdown !== null
                ? <>Révélation dans <b>{countdown}s</b>…</>
                : "En attente des autres joueurs…"}
            </div>
          </div>
        ) : (
          <>
            <div className="pb-cats">
              {categories.map((cat, ci) => {
                const val = myAnswers[ci] ?? "";
                const ok = val.trim() && letterMatches(val, letter);
                return (
                  <motion.div
                    key={ci}
                    className="pb-cat-card"
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: ci * 0.05 }}
                  >
                    <label className="pb-cat-label">{cat}</label>
                    <div className={`pb-input-wrap ${ok ? "ok" : ""}`}>
                      <span className="pb-input-letter">{letter}</span>
                      <input
                        className="pb-input"
                        type="text"
                        value={val}
                        placeholder="ta réponse…"
                        autoComplete="off"
                        autoCorrect="off"
                        spellCheck={false}
                        onChange={(e) => setMyAnswers((m) => ({ ...m, [ci]: e.target.value }))}
                      />
                      {ok ? <span className="pb-input-ok">✓</span> : null}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <JokerBar
              types={PB_JOKERS}
              counts={(room.jokers || {})[playerId] || {}}
              active={myJokerActive}
              disabledTypes={stopAt ? [] : ["timeplus"]}
              onUse={useJoker}
            />
            <div className="pb-speed-hint">⚡ Le premier à finir gagne un bonus… s'il a bien répondu !</div>

            <div className="pb-fill-actions">
              <button className="pb-btn pb-btn-stop" onClick={() => { fx("start"); submit(); }}>
                🛑 STOP — j'ai fini !
              </button>
            </div>
          </>
        )}

        <style>{PB_CSS}</style>
      </div>
    );
  }

  /* ── Phase REVEAL ── */
  const rp = roundPoints();
  const isLast = round >= totalRounds;
  const rankedTotals = [...players].sort((a, b) => (scores[b.id] || 0) - (scores[a.id] || 0));

  return (
    <div className="screen game-screen pb-screen" style={{ ["--fx" as string]: "#0ea5e9", ["--fx2" as string]: "#38bdf8" }}>
        <span className="fx-aurora" aria-hidden />
      <Topbar round={round} totalRounds={totalRounds} onLeave={onLeave} started
              players={players} scores={scores} />

      <div className="pb-reveal-head">
        <div className="pb-letter-badge small">{letter}</div>
        <div className="pb-reveal-title">Résultats de la manche {round}</div>
      </div>

      {/* Récap points par joueur */}
      <div className="pb-totals">
        {rankedTotals.map((p, i) => (
          <motion.div
            key={p.id}
            className="pb-total-chip"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.07 }}
            style={{ borderColor: (p.color || "var(--accent)") + "66" }}
          >
            <span className="pb-total-emoji">{p.emoji || "🙂"}</span>
            <span className="pb-total-name" style={{ color: p.color || "var(--text)" }}>{p.name}</span>
            {p.id === stopBy && (rp[p.id] || 0) > 0 && <span className="pb-total-tag speed" title="Premier à finir">⚡</span>}
            {jokerActiveMap[p.id] === "double" && <span className="pb-total-tag dbl" title="Joker Double">×2</span>}
            <span className="pb-total-round">+{roundGain(p.id, rp[p.id] || 0)}</span>
            <span className="pb-total-sum">{scores[p.id] || 0} pts</span>
          </motion.div>
        ))}
      </div>

      {/* Détail par catégorie */}
      <div className="pb-reveal-cats">
        {categories.map((cat, ci) => (
          <motion.div
            key={ci}
            className="pb-reveal-cat"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + ci * 0.08 }}
          >
            <div className="pb-reveal-cat-title">{cat}</div>
            <div className="pb-reveal-answers">
              <AnimatePresence>
                {categoryResult(ci).map(({ p, a, status, pts }) => (
                  <motion.div
                    key={p.id}
                    className={`pb-ans pb-ans-${status}`}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                  >
                    <span className="pb-ans-emoji">{p.emoji || "🙂"}</span>
                    <span className="pb-ans-text">{a || <i className="pb-ans-empty">— vide —</i>}</span>
                    <span className="pb-ans-pts">
                      {status === "unique" ? "+10" : status === "dup" ? "+5" : "0"}
                    </span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        ))}
      </div>

      {isHost || isSolo ? (
        <div className="pb-fill-actions">
          <button className="pb-btn pb-btn-primary" onClick={nextRound}>
            {isLast ? "🏆 Voir le classement" : "Manche suivante →"}
          </button>
        </div>
      ) : (
        <div className="pb-waiting"><span className="pb-dot-pulse" /> En attente de l'hôte…</div>
      )}

      <style>{PB_CSS}</style>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Topbar — même structure que les autres jeux
   ════════════════════════════════════════════════════════════════════════ */
function Topbar({
  round, totalRounds, onLeave, started, players, scores,
}: {
  round: number;
  totalRounds: number;
  onLeave: () => void;
  started: boolean;
  players: { id: string; name: string; color: string }[];
  scores: Record<string, number>;
}) {
  return (
    <div className="game-topbar">
      <button className="btn-back" onClick={onLeave}>✕</button>
      <div className="turn-indicator">
        {started ? `🅰️ Manche ${round}/${totalRounds}` : "🅰️ Petit Bac"}
      </div>
      <div className="score-mini">
        {players.map((p) => (
          <span key={p.id} style={{ color: p.color || "#333" }}>
            {p.name.slice(0, 4)} {scores[p.id] || 0}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   STYLES (scopés pb-, thèmes clair + sombre via var())
   ════════════════════════════════════════════════════════════════════════ */
const PB_CSS = `
.pb-screen{display:flex;flex-direction:column;gap:.85rem;padding-bottom:1.6rem;}

/* ── Démarrage ── */
.pb-start{max-width:520px;margin:0 auto;width:100%;padding:1.1rem;text-align:center;
  display:flex;flex-direction:column;align-items:center;gap:.7rem;}
.pb-start-badge{width:88px;height:88px;border-radius:26px;display:flex;align-items:center;justify-content:center;
  font-size:3rem;background:linear-gradient(135deg,var(--primary),var(--accent));color:#fff;
  box-shadow:var(--shadow-lg);animation:pbPop .5s ease;}
.pb-start-title{font-family:var(--font-d);font-size:2rem;line-height:1.1;
  background:linear-gradient(90deg,var(--primary),var(--accent));
  -webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;}
.pb-start-sub{color:var(--muted);font-size:.92rem;font-weight:700;line-height:1.55;max-width:440px;}
.pb-rounds-pick{display:flex;flex-direction:column;gap:.45rem;align-items:center;margin-top:.3rem;}
.pb-rounds-label{font-size:.72rem;font-weight:900;text-transform:uppercase;letter-spacing:.1em;color:var(--muted);}
.pb-rounds-btns{display:flex;gap:.5rem;}
.pb-round-chip{width:52px;height:52px;border-radius:50%;border:2px solid var(--border);
  background:var(--surface-1);color:var(--text);font-family:var(--font-d);font-size:1.2rem;
  cursor:pointer;transition:.18s;box-shadow:var(--shadow);}
.pb-round-chip:hover{transform:translateY(-2px);}
.pb-round-chip.sel{border-color:var(--primary);color:#fff;
  background:linear-gradient(135deg,var(--primary),var(--accent));box-shadow:var(--shadow-lg);}

/* ── Boutons ── */
.pb-btn{border:none;border-radius:999px;padding:.95rem 2rem;font-size:1.05rem;font-weight:900;
  cursor:pointer;transition:.18s;font-family:var(--font-b);width:100%;max-width:420px;}
.pb-btn-primary{color:#fff;background:linear-gradient(135deg,var(--primary),var(--accent));
  box-shadow:0 10px 30px rgba(var(--accent-rgb),.4);}
.pb-btn-primary:hover{transform:translateY(-2px);box-shadow:0 14px 40px rgba(var(--accent-rgb),.55);}
.pb-btn-primary:active{transform:translateY(0);}
.pb-btn-stop{color:#fff;background:linear-gradient(135deg,var(--danger),#ff8a5c);
  box-shadow:0 10px 30px rgba(240,69,94,.4);}
.pb-btn-stop:hover{transform:translateY(-2px);}
.pb-btn-stop:active{transform:translateY(0);}

.pb-hint{font-size:.8rem;font-weight:800;color:var(--muted);margin-top:.2rem;}
.pb-waiting{display:flex;align-items:center;justify-content:center;gap:.55rem;font-weight:900;
  color:var(--muted);padding:1rem;font-size:.95rem;}
.pb-dot-pulse{width:10px;height:10px;border-radius:50%;background:var(--primary);animation:pbPulse 1s infinite;}

/* ── Lettre ── */
.pb-letter-wrap{display:flex;flex-direction:column;align-items:center;gap:.35rem;margin-top:.2rem;}
.pb-letter-badge{position:relative;overflow:hidden;width:104px;height:104px;border-radius:30px;display:flex;align-items:center;justify-content:center;
  font-family:var(--font-d);font-size:3.9rem;color:#fff;
  background:linear-gradient(150deg,var(--fx,#0ea5e9),var(--fx2,#38bdf8));
  box-shadow:0 18px 44px color-mix(in srgb,var(--fx,#0ea5e9) 50%,transparent),inset 0 2px 0 rgba(255,255,255,.5),inset 0 -6px 14px rgba(0,0,0,.18);
  text-shadow:0 3px 10px rgba(0,0,0,.28);animation:pbLetterIn .5s cubic-bezier(.34,1.56,.64,1);}
.pb-letter-badge::after{content:"";position:absolute;top:-40%;left:-30%;width:50%;height:200%;transform:rotate(18deg);
  background:linear-gradient(100deg,transparent,rgba(255,255,255,.5),transparent);animation:pbShine 4s ease-in-out infinite;}
@keyframes pbLetterIn{from{transform:scale(.4) rotate(-12deg);opacity:0;}to{transform:scale(1) rotate(0);opacity:1;}}
@keyframes pbShine{0%,100%{transform:translateX(-160%) rotate(18deg);}55%,100%{transform:translateX(360%) rotate(18deg);}}
@media (prefers-reduced-motion: reduce){.pb-letter-badge::after{animation:none;}}
.pb-letter-badge.small{width:52px;height:52px;border-radius:16px;font-size:1.9rem;box-shadow:var(--shadow);}
.pb-letter-caption{font-size:.78rem;font-weight:800;color:var(--muted);}

/* ── Slot statut (hauteur fixe) ── */
.pb-status-slot{min-height:46px;display:flex;align-items:center;justify-content:center;
  max-width:560px;margin:0 auto;width:calc(100% - 1.6rem);}
.pb-status-idle{font-size:.85rem;font-weight:900;color:var(--muted);}
.pb-grace{display:flex;align-items:center;gap:.5rem;font-size:.95rem;font-weight:900;color:var(--text);
  background:linear-gradient(135deg,rgba(240,171,52,.2),rgba(var(--accent-rgb),.12));
  border:1px solid var(--border);padding:.5rem 1rem;border-radius:999px;box-shadow:var(--shadow);}
.pb-grace.urgent{color:#fff;background:linear-gradient(135deg,var(--danger),#ff8a5c);
  animation:pbBeat .6s ease-in-out infinite;}
.pb-grace-emoji{font-size:1.15rem;}

/* ── Catégories (fill) ── */
.pb-cats{display:grid;grid-template-columns:repeat(2,1fr);gap:.65rem;
  max-width:560px;margin:0 auto;width:calc(100% - 1.6rem);}
.pb-cat-card{display:flex;flex-direction:column;gap:.35rem;background:var(--surface-1);
  border:1px solid var(--border);border-radius:var(--radius);padding:.65rem .7rem;box-shadow:var(--shadow);}
.pb-cat-label{font-size:.74rem;font-weight:900;color:var(--accent);text-transform:uppercase;
  letter-spacing:.04em;line-height:1.15;min-height:1.9em;display:flex;align-items:center;}
.pb-input-wrap{display:flex;align-items:center;gap:.4rem;border:2px solid var(--border);border-radius:var(--radius-sm);
  background:var(--surface-2);padding:.15rem .5rem;transition:.15s;}
.pb-input-wrap:focus-within{border-color:var(--accent);box-shadow:0 0 0 3px var(--ring);}
.pb-input-wrap.ok{border-color:var(--green);}
.pb-input-letter{font-family:var(--font-d);font-size:1rem;color:var(--accent);opacity:.8;}
.pb-input{flex:1;min-width:0;border:none;background:transparent;outline:none;font-family:var(--font-b);
  font-size:1rem;font-weight:800;color:var(--text);padding:.5rem 0;}
.pb-input::placeholder{color:var(--muted);opacity:.6;font-weight:700;}
.pb-input-ok{color:var(--green);font-weight:900;font-size:1rem;}

.pb-speed-hint{text-align:center;font-size:.76rem;color:var(--muted);margin:.5rem auto 0;max-width:560px;}
.pb-total-tag{font-family:var(--font-d);font-size:.66rem;font-weight:900;padding:.02rem .3rem;border-radius:999px;margin-left:.15rem;}
.pb-total-tag.speed{color:#c47d00;background:color-mix(in srgb,var(--warning,#ffbe42) 26%,transparent);}
.pb-total-tag.dbl{color:var(--accent);background:color-mix(in srgb,var(--accent) 18%,transparent);}
.pb-fill-actions{max-width:560px;margin:.5rem auto 0;width:calc(100% - 1.6rem);display:flex;justify-content:center;}

/* ── Carte « fini » ── */
.pb-done-card{max-width:440px;margin:.4rem auto 0;width:calc(100% - 1.6rem);text-align:center;
  display:flex;flex-direction:column;align-items:center;gap:.4rem;padding:1.6rem 1.2rem;
  background:var(--surface-1);border:1px solid var(--border);border-radius:var(--radius);box-shadow:var(--shadow);
  animation:pbPop .35s ease;}
.pb-done-check{width:64px;height:64px;border-radius:50%;display:flex;align-items:center;justify-content:center;
  font-size:2rem;color:#fff;background:linear-gradient(135deg,var(--green),#3ddc97);box-shadow:var(--shadow);}
.pb-done-txt{font-family:var(--font-d);font-size:1.25rem;color:var(--text);}
.pb-done-sub{font-size:.88rem;font-weight:800;color:var(--muted);}

/* ── Révélation ── */
.pb-reveal-head{display:flex;align-items:center;justify-content:center;gap:.6rem;margin-top:.2rem;}
.pb-reveal-title{font-family:var(--font-d);font-size:1.3rem;color:var(--text);}
.pb-totals{display:flex;flex-wrap:wrap;justify-content:center;gap:.5rem;
  max-width:560px;margin:0 auto;width:calc(100% - 1.6rem);}
.pb-total-chip{display:flex;align-items:center;gap:.4rem;background:var(--surface-1);
  border:2px solid var(--border);border-radius:999px;padding:.35rem .7rem;box-shadow:var(--shadow);}
.pb-total-emoji{font-size:1.05rem;}
.pb-total-name{font-weight:900;font-size:.85rem;max-width:80px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.pb-total-round{font-family:var(--font-d);font-size:.9rem;color:var(--green);}
.pb-total-sum{font-weight:900;font-size:.78rem;color:var(--muted);background:var(--surface-3);
  padding:.1rem .45rem;border-radius:999px;}

.pb-reveal-cats{display:flex;flex-direction:column;gap:.7rem;
  max-width:560px;margin:.3rem auto 0;width:calc(100% - 1.6rem);}
.pb-reveal-cat{background:var(--surface-1);border:1px solid var(--border);border-radius:var(--radius);
  padding:.7rem .8rem;box-shadow:var(--shadow);}
.pb-reveal-cat-title{font-family:var(--font-d);font-size:.98rem;color:var(--accent);margin-bottom:.5rem;}
.pb-reveal-answers{display:flex;flex-direction:column;gap:.4rem;}
.pb-ans{display:flex;align-items:center;gap:.5rem;padding:.4rem .6rem;border-radius:var(--radius-sm);
  border:1px solid var(--border);background:var(--surface-2);}
.pb-ans-unique{border-color:var(--green);background:linear-gradient(90deg,rgba(36,178,107,.16),var(--surface-2));}
.pb-ans-dup{border-color:var(--gold);background:linear-gradient(90deg,rgba(240,171,52,.16),var(--surface-2));}
.pb-ans-invalid{opacity:.72;}
.pb-ans-emoji{font-size:1.05rem;flex:0 0 auto;}
.pb-ans-text{flex:1;min-width:0;font-weight:800;font-size:.95rem;color:var(--text);
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.pb-ans-empty{color:var(--muted);font-weight:700;font-size:.85rem;}
.pb-ans-pts{font-family:var(--font-d);font-size:.95rem;flex:0 0 auto;
  min-width:34px;text-align:right;color:var(--muted);}
.pb-ans-unique .pb-ans-pts{color:var(--green);}
.pb-ans-dup .pb-ans-pts{color:var(--gold);}

/* ── Animations ── */
@keyframes pbPop{from{transform:scale(.7);opacity:0;}to{transform:scale(1);opacity:1;}}
@keyframes pbPulse{0%,100%{transform:scale(1);opacity:1;}50%{transform:scale(1.5);opacity:.4;}}
@keyframes pbBeat{0%,100%{transform:scale(1);}50%{transform:scale(1.05);}}

@media (max-width:400px){
  .pb-cats{grid-template-columns:1fr;}
  .pb-start-title{font-size:1.7rem;}
  .pb-letter-badge{width:84px;height:84px;font-size:3.1rem;}
}
`;
